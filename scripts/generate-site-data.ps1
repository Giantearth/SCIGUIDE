param(
    [string]$DatabaseDir = "D:\SCIGUIDEAPP\DATABASE",
    [string]$OutputFile = "D:\SCIGUIDEAPP\site\data.js"
)

function Get-FirstMatch {
    param(
        [string]$Content,
        [string]$Pattern
    )

    $match = [regex]::Match($Content, $Pattern, [System.Text.RegularExpressions.RegexOptions]::Multiline)
    if ($match.Success) {
        return $match.Groups[1].Value.Trim()
    }
    return $null
}

function Get-Matches {
    param(
        [string]$Content,
        [string]$Pattern
    )

    $values = [regex]::Matches($Content, $Pattern, [System.Text.RegularExpressions.RegexOptions]::Multiline) |
        ForEach-Object { $_.Groups[1].Value.Trim() } |
        Where-Object { $_ }

    return @($values | Select-Object -Unique)
}

function Add-IfMatch {
    param(
        [System.Collections.Generic.List[string]]$List,
        [string]$Text,
        [string]$Needle,
        [string]$Value
    )

    if ($Text -match [regex]::Escape($Needle) -and -not $List.Contains($Value)) {
        $List.Add($Value)
    }
}

function Get-DerivedMeta {
    param(
        [string]$Name,
        [string]$Content
    )

    $text = "$Name`n$Content"
    $module = "other"
    $summary = "数据库原始内容"

    switch -Regex ($text) {
        "红旗|禁忌|DVT|低血压|压疮|AD|疼痛管理|痉挛" { $module = "complication"; $summary = "并发症与风险管理"; break }
        "康复红旗征" { $module = "redflags"; $summary = "红旗征优先核查"; break }
        "超急性期|急性期|亚急性期|病程分期" { $module = "stage"; $summary = "病程阶段相关内容"; break }
        "康复目标|PT 目标|OT 目标|ST 目标|呼吸康复目标" { $module = "goals"; $summary = "康复目标与专业分工"; break }
        "多学科康复治疗重点" { $module = "focus"; $summary = "多学科治疗重点"; break }
        "ASIA|AIS|颈段脊髓损伤|胸段脊髓损伤|腰骶段及马尾损伤" { $module = "expectation"; $summary = "按节段与 AIS 查看功能潜力"; break }
        "转移|步行|居家" { $module = "function"; $summary = "功能训练与居家指导"; break }
    }

    $etiologies = New-Object System.Collections.Generic.List[string]
    $subtypes = New-Object System.Collections.Generic.List[string]
    $levels = New-Object System.Collections.Generic.List[string]
    $stages = New-Object System.Collections.Generic.List[string]
    $professions = New-Object System.Collections.Generic.List[string]
    $ais = New-Object System.Collections.Generic.List[string]

    Add-IfMatch $etiologies $text "创伤性" "traumatic"
    Add-IfMatch $etiologies $text "TSCI" "traumatic"
    Add-IfMatch $etiologies $text "非创伤性" "nontraumatic"
    Add-IfMatch $etiologies $text "NTSCI" "nontraumatic"

    Add-IfMatch $subtypes $text "缺血性" "ischemic"
    Add-IfMatch $subtypes $text "肿瘤性" "neoplastic"
    Add-IfMatch $subtypes $text "特殊机制" "other_nontraumatic"
    Add-IfMatch $subtypes $text "电击" "other_nontraumatic"
    Add-IfMatch $subtypes $text "潜水减压病" "other_nontraumatic"

    Add-IfMatch $levels $text "颈段" "cervical"
    Add-IfMatch $levels $text "颈髓" "cervical"
    Add-IfMatch $levels $text "C1" "cervical"
    Add-IfMatch $levels $text "胸段" "thoracic"
    Add-IfMatch $levels $text "高胸段" "thoracic"
    Add-IfMatch $levels $text "T6" "thoracic"
    Add-IfMatch $levels $text "腰骶段" "lumbosacral"
    Add-IfMatch $levels $text "马尾" "lumbosacral"
    Add-IfMatch $levels $text "L1" "lumbosacral"

    Add-IfMatch $stages $text "72小时内" "hyperacute"
    Add-IfMatch $stages $text "<72小时" "hyperacute"
    Add-IfMatch $stages $text "14天内" "acute"
    Add-IfMatch $stages $text "14天以后" "rehab"
    Add-IfMatch $stages $text "亚急性期" "rehab"
    Add-IfMatch $stages $text "康复期" "rehab"

    Add-IfMatch $professions $text "物理治疗" "PT"
    Add-IfMatch $professions $text "PT" "PT"
    Add-IfMatch $professions $text "作业治疗" "OT"
    Add-IfMatch $professions $text "OT" "OT"
    Add-IfMatch $professions $text "言语治疗" "ST"
    Add-IfMatch $professions $text "ST" "ST"
    Add-IfMatch $professions $text "呼吸康复" "RESP"
    Add-IfMatch $professions $text "助咳" "RESP"

    foreach ($grade in @("A", "B", "C", "D", "E")) {
        Add-IfMatch $ais $text "AIS $grade" $grade
    }

    if ($module -eq "redflags") {
        $displayGroup = "redflags"
    } elseif ($module -eq "stage") {
        $displayGroup = "stage"
    } elseif ($module -eq "goals") {
        $displayGroup = "goals"
    } elseif ($module -eq "focus") {
        $displayGroup = "focus"
    } elseif ($module -eq "expectation") {
        $displayGroup = "expectation"
    } elseif ($module -eq "function") {
        $displayGroup = "function"
    } elseif ($module -eq "complication") {
        $displayGroup = "complication"
    } else {
        $displayGroup = "other"
    }

    return [ordered]@{
        module = $module
        displayGroup = $displayGroup
        summary = $summary
        etiologies = @($etiologies)
        subtypes = @($subtypes)
        levels = @($levels)
        stages = @($stages)
        professions = @($professions)
        ais = @($ais)
    }
}

$files = Get-ChildItem -Path $DatabaseDir -Filter *.md -File | Sort-Object Name
$docs = @()

foreach ($file in $files) {
    $content = Get-Content -Encoding utf8 -Raw $file.FullName
    $title = Get-FirstMatch -Content $content -Pattern '^Title:\s*(.+)$'
    if (-not $title) {
        $title = Get-FirstMatch -Content $content -Pattern '^#\s+(.+)$'
    }
    if (-not $title) {
        $title = $file.BaseName
    }

    $type = Get-FirstMatch -Content $content -Pattern '^Type:\s*(.+)$'
    $sources = Get-Matches -Content $content -Pattern '\[\[([^\]]+)\]\]'
    $tagLine = Get-FirstMatch -Content $content -Pattern '^#标签:\s*(.+)$'
    $tags = @()
    if ($tagLine) {
        $tags = $tagLine.Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object { $_.Trim() }
    }

    $derived = Get-DerivedMeta -Name $file.BaseName -Content $content

    $docs += [ordered]@{
        id = $file.BaseName.Replace('\', '-')
        path = "DATABASE/$($file.Name)"
        title = $title
        type = $type
        sources = @($sources | Where-Object { $_ -match '中国|德国|日本|美国|PVA' } | Select-Object -Unique)
        tags = @($tags)
        content = $content
        module = $derived.module
        displayGroup = $derived.displayGroup
        summary = $derived.summary
        etiologies = $derived.etiologies
        subtypes = $derived.subtypes
        levels = $derived.levels
        stages = $derived.stages
        professions = $derived.professions
        ais = $derived.ais
    }
}

$json = $docs | ConvertTo-Json -Depth 8 -Compress
$output = "window.__SCI_DATA__ = $json;"
Set-Content -Path $OutputFile -Encoding utf8 -Value $output
Write-Host "Generated $OutputFile with $($docs.Count) docs."

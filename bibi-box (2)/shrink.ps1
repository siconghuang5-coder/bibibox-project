Add-Type -AssemblyName System.Drawing
$files = Get-ChildItem -Path "d:\bibibox\yang\bibi-box (2)\static\tab-*.png"
foreach ($file in $files) {
    Try {
        $img = [System.Drawing.Image]::FromFile($file.FullName)
        $w = $img.Width
        $h = $img.Height
        $newW = [int]($w * 1.4)
        $newH = [int]($h * 1.4)
        $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $x = [int](($newW - $w) / 2)
        $y = [int](($newH - $h) / 2)
        $g.DrawImage($img, $x, $y, $w, $h)
        $img.Dispose()
        $g.Dispose()
        $tempFile = $file.FullName + ".tmp.png"
        $bmp.Save($tempFile, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        Remove-Item $file.FullName -Force
        Rename-Item $tempFile $file.Name
    } Catch {
        Write-Host "Error processing $file"
    }
}

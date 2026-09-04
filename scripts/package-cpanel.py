"""Package the built site with Linux-safe permissions for cPanel extraction."""
import sys
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
output = Path(sys.argv[1]).resolve()
selected = set(sys.argv[2:])
if not (dist / 'index.html').is_file():
    raise SystemExit('Run npm run build first')
output.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(dist.rglob('*')):
        if not path.is_file():
            continue
        name = path.relative_to(dist).as_posix()
        if selected and name not in selected:
            continue
        info = zipfile.ZipInfo.from_file(path, name)
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, path.read_bytes())
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    assert all((item.external_attr >> 16) & 0o777 == 0o644 for item in archive.infolist())
    print(f'{output}: {len(archive.infolist())} files, {output.stat().st_size} bytes')

import gzip
import json
import pathlib
import numpy as np


root = pathlib.Path(__file__).resolve().parents[1]
source = root.parent / 'canopy-integrated-local/scenes/imperial_corridor_8km'
target = root / 'scenes/imperial_corridor_8km'
backup = root.parent / 'canopy-fields-before-8bit-scene.json'
if not backup.exists():
    backup.write_bytes((target / 'scene.json').read_bytes())
scene = json.loads(backup.read_text())
transport = scene['protocol_display']['npy_transport']
report = {}
for name, entry in transport.items():
    if name.startswith('masks/') or name.startswith('shadow') or name == 'temp.npy':
        continue
    low, high = float('inf'), float('-inf')
    original_bytes = 0
    for part in entry['parts']:
        path = source / 'physics' / part['file']
        values = np.frombuffer(gzip.decompress(path.read_bytes()), dtype=entry['meta']['descr'])
        finite = values[np.isfinite(values)]
        if finite.size:
            low = min(low, float(finite.min()))
            high = max(high, float(finite.max()))
        original_bytes += path.stat().st_size
    scale = (high - low) / 254 if high > low else 1.0
    output_parts = []
    compressed_bytes = 0
    maximum_error = 0.0
    total_error = 0.0
    valid_count = 0
    for part_index, part in enumerate(entry['parts']):
        values = np.frombuffer(gzip.decompress((source / 'physics' / part['file']).read_bytes()), dtype=entry['meta']['descr']).astype(np.float32)
        valid = np.isfinite(values)
        codes = np.full(values.size, 255, dtype=np.uint8)
        codes[valid] = np.rint((values[valid] - low) / scale).clip(0, 254).astype(np.uint8)
        errors = np.abs(codes[valid].astype(np.float32) * scale + low - values[valid])
        if errors.size:
            maximum_error = max(maximum_error, float(errors.max()))
            total_error += float(errors.sum(dtype=np.float64))
            valid_count += errors.size
        filename = f'chunks/quantized8/{pathlib.Path(name).stem}/{part_index:04d}.gz'
        destination = target / 'physics' / filename
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(gzip.compress(codes.tobytes(), compresslevel=6, mtime=0))
        compressed_bytes += destination.stat().st_size
        output_parts.append({'file': filename, 'offset': part['offset'] // entry['meta']['itemsize'], 'bytes': codes.size})
    entry['total_bytes'] //= entry['meta']['itemsize']
    entry['parts'] = output_parts
    entry['meta'].update(descr='|u1', itemsize=1, quantization={'scale': scale, 'offset': low, 'invalid_code': 255, 'method': 'uniform-global-field-8bit'})
    report[name] = {'source_bytes': original_bytes, 'bytes': compressed_bytes, 'range': [low, high], 'max_error': maximum_error, 'mean_error': total_error / max(1, valid_count)}
    print(name, report[name], flush=True)
(target / 'scene.json').write_text(json.dumps(scene, ensure_ascii=False, indent=2) + '\n')
(root.parent / 'canopy-fields-8bit-report.json').write_text(json.dumps(report, indent=2) + '\n')

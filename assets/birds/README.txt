Bird replay transport

The gzip files preserve every byte of the original float32 trajectory and uint8
state arrays. No frames, birds, or trajectory samples were removed. The original
retained simulation run remains in canopy-birds-simulation/project/
imperial_corridor_8km/runs/birds_eight_flocks_20261109.

compression-report.json records decoded SHA-256 hashes and byte counts.
bird_replay.json describes the decoded original arrays. The viewer appends .gz
and decompresses locally with DecompressionStream before constructing the layer.

The estimated combined runtime payload is approximately 475 MB after this change
and 8-bit field quantization. This is an asset-size estimate, not a newly
published release or a measured complete browser download.

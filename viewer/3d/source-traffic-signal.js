// Restored from the original Imperial Corridor viewer app.mjs.
// Geometry and dimensions preserved; static coloured aspects, no recorded phases.
export const trafficSignalAsset = {
  id: "traffic_signal",
  kind: "street",
  name: "Traffic signal",
  size: [0.4, 0.4, 3.6],
  references: [
    {
      title: "Reducing street clutter: shared signals and lighting (SWOV)",
      url: "https://swov.nl/en/publicatie/reducing-street-clutter-shared-signals-and-lighting",
      used_for: "signal pole as a separate street element",
    },
  ],
  notes: "Aspects drawn red/amber/green, not timed.",
  build({ THREE: i, kit: e, detail: n = "high" }) {
    let r = new i.Group(),
      t = e.mat("#2b2e31"),
      o = (a, s, c = 0, f = 0, p = 0) => {
        let v = new i.Mesh(a, s);
        return (v.position.set(c, f, p), r.add(v), v);
      };
    return (
      o(
        new i.CylinderGeometry(0.06, 0.07, 3.1, n === "low" ? 6 : 10).rotateX(
          Math.PI / 2,
        ),
        t,
        0,
        0,
        1.55,
      ),
      o(new i.BoxGeometry(0.32, 0.25, 0.95), e.mat("black"), 0, 0.12, 2.9),
      o(new i.BoxGeometry(0.52, 0.02, 1.17), e.mat("#f2f2f2"), 0, -0.005, 2.9),
      o(new i.BoxGeometry(0.46, 0.025, 1.11), e.mat("#1a1a1a"), 0, 0, 2.9),
      ["#d42a1f", "#e8a317", "#2aa84a"].forEach((a, s) => {
        (o(
          new i.CylinderGeometry(0.09, 0.09, 0.03, 12),
          e.mat(a, { emissive: new i.Color(a), emissiveIntensity: 0.35 }),
          0,
          0.26,
          3.2 - s * 0.3,
        ),
          n !== "low" &&
            (o(
              new i.CylinderGeometry(
                0.12,
                0.12,
                0.2,
                12,
                1,
                !0,
                -Math.PI / 2,
                Math.PI,
              ),
              e.mat("black"),
              0,
              0.36,
              3.24 - s * 0.3,
            ).rotation.x = Math.PI / 2));
      }),
      n !== "low" &&
        (o(new i.BoxGeometry(0.16, 0.12, 0.3), e.mat("#d8d4c8"), 0, 0.1, 1.15),
        o(new i.BoxGeometry(0.06, 0.02, 0.06), e.mat("#d42a1f"), 0, 0.17, 1.1),
        o(
          new i.CylinderGeometry(0.11, 0.12, 0.25, 10).rotateX(Math.PI / 2),
          t,
          0,
          0,
          0.125,
        )),
      r
    );
  },
};

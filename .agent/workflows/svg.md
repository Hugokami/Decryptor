---
description: Deterministic SVG generation, validation, and rendering using the svg-precision skill.
---

# /svg - SVG Precision Generator

$ARGUMENTS

---

## 🛠️ Objective

This command utilizes the `svg-precision` skill to generate structurally correct SVGs from a strict JSON spec (scene graph), followed by validation and optional PNG rendering.

### 📋 Steps

1. **Spec Discovery**
   - Analyze the user request to determine if it's an **icon**, **diagram**, **chart**, **UI**, or **technical drawing**.
   - Create a **Spec JSON** based on templates in `C:\Users\lyan1\.gemini\antigravity\skills\svg-precision\references\spec.md`.

2. **SVG Construction**
   - Invoke the `svg-precision` skill to build the SVG:
     ```bash
     python C:\Users\lyan1\.gemini\antigravity\skills\svg-precision\scripts\svg_cli.py build spec.json out.svg
     ```

3. **Validation & Quality Control**
   - Run the validation script to ensure structural correctness:
     ```bash
     python C:\Users\lyan1\.gemini\antigravity\skills\svg-precision\scripts\svg_cli.py validate out.svg
     ```

4. **Visualization (Optional)**
   - If CairoSVG is available, render a PNG preview:
     ```bash
     python C:\Users\lyan1\.gemini\antigravity\skills\svg-precision\scripts\svg_cli.py render out.svg out.png --scale 2
     ```
   - Present the rendered output and the raw SVG code to the user.

---

## 🚀 Usage Examples

```powershell
/svg a minimal industrial logo with lime accents
/svg complex technical diagram for a web3 decryptor
/svg a set of 5 consistent startup icons
```

---

## 💡 Best Practices

- Always set `canvas.viewBox` and explicit dimensions.
- Prefer absolute coordinates; use transforms only for complexity reduction.
- Round numbers to 3-4 decimals for precision.
- Use `defs` for reusable markers, gradients, and clipPaths.

> [!IMPORTANT]
> This command is optimized for precision and industrial aesthetics. If requested to be "more creative," follow the **Industrial Decryptor** design guidelines from `ag-web3.js` context.

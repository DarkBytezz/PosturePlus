import DeviationBar from "./DeviationBar"

type Props = {
  forward: number
  lateral: number
  shoulder: number
}

export default function DeviationBars({
  forward,
  lateral,
  shoulder,
}: Props) {
  return (
    <div className="mt-4 space-y-3">

      <DeviationBar
        label="Forward Lean"
        value={forward}
        max={0.12}
      />

      <DeviationBar
        label="Lateral Tilt"
        value={lateral}
        max={0.12}
      />

      <DeviationBar
        label="Shoulder Imbalance"
        value={shoulder}
        max={0.08}
      />

    </div>
  )
}
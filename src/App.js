import * as R from "rambda"
import React, {useCallback, useRef, useState} from "react"
import {
  Selection,
  LineSegment,
  VictoryCursorContainer,
  VictoryChart, VictoryAxis, VictoryTheme, VictoryScatter,
  VictoryLabel, VictoryLegend,
} from "victory"
import {classifyFact, invert, round, roundToDotFive} from "./lib"
import db from "./db.json"

export default function App() {
  let ref = useRef()

  let [juniors, setJuniors] = useState(db.juniors.map(j => R.omit(["english"], j)))
  let [middles, setMiddles] = useState(db.middles.map(m => R.omit(["english"], m)))
  let [seniors, setSeniors] = useState(db.seniors.map(s => R.omit(["english"], s)))

  let [mode, setMode] = useState("juniors")

  let onDrop = useCallback((event) => {
    if (ref.current) {
      let {experience, salary} = ref.current
      if (mode == "unknown") {
        mode = classifyFact(
          [
            ...juniors.map(j => ({...j, "@tag": "juniors"})),
            ...middles.map(j => ({...j, "@tag": "middles"})),
            ...seniors.map(j => ({...j, "@tag": "seniors"})),
          ],
          {experience, salary}
        )
      }
      switch (mode) {
        case "juniors": setJuniors(R.append({experience, salary})); break
        case "middles": setMiddles(R.append({experience, salary})); break
        case "seniors": setSeniors(R.append({experience, salary})); break
        default: throw new Error(`invalid mode ${mode}`)
      }
    }
  }, [mode])

  return <div style={{padding: "2rem"}}>
    <h1>KNN Classification Demo</h1>
    <Description/>
    <div style={{cursor: `url('${modeToFile[mode]}') 4 4, auto`}}>
      <div style={{width: "600px", backgroundColor: "white"}}>
        <VictoryChart
          theme={VictoryTheme.material}
          domain={{x: [0, 12], y: [0, 10]}}
          containerComponent={<VictoryCursorContainer
            cursorLabel={cursorLabel}
            cursorLabelComponent={<VictoryLabel style={{fontSize: 12, fill: "grey"}}/>}
            onCursorChange={(data) => {
              let {x, y} = data ? data : {x: 0, y: 0}
              ref.current = {experience: roundToDotFive(x), salary: round(y, 1)}
            }}
            cursorComponent={<LineSegment style={{stroke: "grey", strokeDasharray: "4 4"}}/>}
          />}
          events={[{
            target: "parent",
            eventHandlers: {
              onClick: onDrop,
            }
          }]}
        >
          <Legend/>

          <Scatter dataStyle={styles.juniors} data={juniors}/>
          <Scatter dataStyle={styles.middles} data={middles}/>
          <Scatter dataStyle={styles.seniors} data={seniors}/>

          {makeAxisX()}
          {makeAxisY()}
        </VictoryChart>
      </div>

      <ColorRadios
        label="Series"
        onChange={({value, label}) => setMode(colorsToModes[value])}
        options={[
          {value: colors.juniors, label: "Juniors"},
          {value: colors.middles, label: "Middles"},
          {value: colors.seniors, label: "Seniors"},
          {value: colors.unknown, label: "Detect 🕵️️"},
        ]}
        selected={colors[mode]}
      />
    </div>
  </div>
}

function Description() {
  return <>
    <h3>Developer level derived from Experience and Salary.</h3>
    <p>
      <strong>Algorithm:</strong> KNN <small>(const K = 5)</small><br/>
      <strong>Techs:</strong> Rambda, React, Victory (+D3)<br/>
      <strong>Stats:</strong> from <a href="https://djinni.co">Djinni.co</a> <small>(Ukraine)</small><br/>
    </p>
  </>
}

function makeAxisX() {
  return <VictoryAxis
    label="Experience, years"
    axisLabelComponent={<VictoryLabel dy={30}/>}
    tickValues={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
  />
}

function makeAxisY() {
  return <VictoryAxis
    axisLabelComponent={<VictoryLabel dy={-30}/>}
    dependentAxis={true}
    label="Salary, $"
    tickFormat={(t) => `${t}k`}
    tickValues={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
  />
}

function Legend(props) {
  return <VictoryLegend
    {...props}
    x={128} y={15}
    title=""
    style={{labels: {fontSize: 10}}}
    orientation="horizontal"
    data={[
      {name: "Juniors", symbol: styles.juniors},
      {name: "Middles", symbol: styles.middles},
      {name: "Seniors", symbol: styles.seniors},
    ]}
  />
}

function Scatter({data, dataStyle, ...rest}) {
  return <VictoryScatter
    {...rest}
    data={data}
    size={3}
    style={{data: dataStyle}}
    x="experience"
    y="salary"
  />
}

let cursorLabel = ({datum}) => {
  return `(${roundToDotFive(datum.x)}, ${datum.y.toFixed(1)})`
}

let colors = {
  unknown: "#aaaaaa",
  juniors: "#33bb33",
  middles: "#ddbb33",
  seniors: "#dd3333",
}

let modeToFile = {
  unknown: "grey.png",
  juniors: "green.png",
  middles: "orange.png",
  seniors: "red.png",
}

let styles = {
  unknown: {fill: colors.unknown},
  juniors: {fill: colors.juniors},
  middles: {fill: colors.middles},
  seniors: {fill: colors.seniors},
}

let colorsToModes = invert(colors)

function ColorRadios({label, onChange, options, selected}) {
  return <div style={{marginTop: "1rem"}}>
    <label><b>Series</b></label>
    {options.map(option => {
      return <ColorRadio
        key={option.value}
        color={option.value}
        label={option.label}
        onClick={_ => onChange({value: option.value, label: option.label})}
        selected={selected == option.value}
      />
    })}
  </div>
}

function ColorRadio({color, onClick, label, selected}) {
  return <div
    style={{display: "flex", gap: "0.5rem", margin: "0.5rem", cursor: "pointer"}}
    onClick={onClick}
  >
    <div style={{width: 20, height: 20}}>
      <svg viewBox="0 0 12 12">
        <circle
          cx="6" cy="6" r="8"
          fill={color} stroke={color}
          strokeWidth={2} strokeOpacity={selected ? 1 : 0}
        />
      </svg>
    </div>
    <span>{label} {selected && "◂"}</span>
  </div>
}

import * as R from "rambdax"
import React, {useCallback, useRef, useState} from "react"
import {
  Selection,
  LineSegment,
  VictoryCursorContainer,
  VictoryChart, VictoryAxis, VictoryTheme, VictoryScatter,
  VictoryLabel, VictoryLegend,
} from "victory"
import {classifyByKNN, invert, round, splitTestTraining} from "./lib"
import db from "./db.json"

// ENGLISH
// basic -> 0
// pre-intermediate -> 1
// intermediate -> 2
// upper intermediate -> 3
// fluent -> 4

const TEST_COUNT = 10

export default function App() {
  let ref = useRef()

  let [resumes, setResumes] = useState(db.resumes.map(R.omit(["english"]))) // Ignore EN level for now...
  let [mode, setMode] = useState("junior")
  let [klog, setKLog] = useState("...")

  let addResume = useCallback(event => {
    if (ref.current) {
      let {experience, salary} = ref.current
      let label = (mode == "unknown")
        ? classifyByKNN(resumes, {experience, salary})
        : mode
      setResumes(R.append({experience, salary, label}))
    }
  }, [mode])

  let findBestK = useCallback(event => {
    let [testResumes, trainingResumes] = splitTestTraining(resumes, TEST_COUNT)

    let kResults = R.map(k => ({
      k: k,
      errors: R.sum(R.map(resume => {
        return Number(classifyByKNN(trainingResumes, resume, k) != resume.label)
      }, testResumes))
    }), [3, 5, 7, 9])

    setKLog(JSON.stringify(kResults, null, 2))
    // "Best K" is highly unstable @_@
    // return R.reduce(R.minBy(R.prop("errors")), {k: 0, errors: Infinity}, kResults).k
  }, [])

  return <div style={{padding: "2rem"}}>
    <h1>KNN Classification Demo</h1>
    <Description/>
    <div style={{display: "grid", gridTemplateColumns: "1fr 1fr"}}>
      <div style={{backgroundColor: "white", cursor: `url('${modeToFile[mode]}') 4 4, auto`}}>
        <VictoryChart
          theme={VictoryTheme.material}
          domain={{x: [0, 12], y: [0, 10]}}
          containerComponent={<VictoryCursorContainer
            cursorLabel={cursorLabel}
            cursorLabelComponent={<VictoryLabel style={{fontSize: 12, fill: "grey"}}/>}
            onCursorChange={(data) => {
              let {x, y} = data ? data : {x: 0, y: 0}
              ref.current = {experience: round(x, 1), salary: round(y, 1)}
            }}
            cursorComponent={<LineSegment style={{stroke: "grey", strokeDasharray: "4 4"}}/>}
          />}
          events={[{
            target: "parent",
            eventHandlers: {
              onClick: addResume,
            }
          }]}
        >
          <Legend/>

          <Scatter dataStyle={styles.junior} data={resumes.filter(r => r.label == "junior")}/>
          <Scatter dataStyle={styles.middle} data={resumes.filter(r => r.label == "middle")}/>
          <Scatter dataStyle={styles.senior} data={resumes.filter(r => r.label == "senior")}/>

          {makeAxisX()}
          {makeAxisY()}
        </VictoryChart>
      </div>
      <div style={{padding: "0 1rem"}}>
        <Button onClick={findBestK}>
          Find best K
        </Button>
        <pre style={{background: "white", padding: "1rem 0.5rem"}}><code style={{fontSize: "1rem"}}>
          {klog}
        </code></pre>
      </div>
    </div>

    <ColorRadios
      label="Series"
      onChange={({value, label}) => setMode(colorsToModes[value])}
      options={[
        {value: colors.junior,  label: "Juniors"},
        {value: colors.middle,  label: "Middles"},
        {value: colors.senior,  label: "Seniors"},
        {value: colors.unknown, label: "Detect 🕵️️"},
      ]}
      selected={colors[mode]}
    />
  </div>
}

function Description() {
  return <>
    <h3>Developer level derived from Experience and Salary.</h3>
    <p>
      <strong>Algorithm:</strong> KNN <small>(dynamic K)</small><br/>
      <strong>Techs:</strong> RambdaX, React, Victory (+D3)<br/>
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
      {name: "Juniors", symbol: styles.junior},
      {name: "Middles", symbol: styles.middle},
      {name: "Seniors", symbol: styles.senior},
    ]}
  />
}

function Scatter({data, dataStyle, ...rest}) {
  let cleanData = R.map(R.pick(["experience", "salary"]), data)
  return <VictoryScatter
    {...rest}
    data={cleanData}
    size={3}
    style={{data: dataStyle}}
    x="experience"
    y="salary"
  />
}

let cursorLabel = ({datum}) => {
  return `(${datum.x.toFixed(1)}, ${datum.y.toFixed(1)})`
}

let colors = {
  unknown: "#aaaaaa",
  junior: "#33bb33",
  middle: "#ddbb33",
  senior: "#dd3333",
}

let modeToFile = {
  unknown: "grey.png",
  junior: "green.png",
  middle: "orange.png",
  senior: "red.png",
}

let styles = {
  unknown: {fill: colors.unknown},
  junior: {fill: colors.junior},
  middle: {fill: colors.middle},
  senior: {fill: colors.senior},
}

let colorsToModes = invert(colors)

// Components ======================================================================================
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
    style={{
      cursor: "pointer",
      display: "flex",
      gap: "0.5rem",
      margin: "0.5rem",
    }}
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

function Button({onClick = null, children}) {
  return <button
    onClick={onClick}
    style={{
      background: "#fff",
      border: "0px",
      cursor: "pointer",
      fontSize: "24px",
      padding: "0.5rem",
    }}
  >
    {children}
  </button>
}

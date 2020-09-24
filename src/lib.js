import * as R from "rambdax"

// Dev. Helpers ====================================================================================
export let logAs = (label) => {
  return function (x) {
    console.log(label + ":", x)
    return x
  }
}

// Collections =====================================================================================
export let countBy = R.curry((get, xs) => {
  return xs.reduce((z, x) => {
    let k = get(x) // "a"
    return {...z, [k]: z[k] == null ? 1 : z[k] + 1}
  }, {})
})

export let invert = (obj) => {
  return R.keys(obj).reduce((z, k) => {
    let v = obj[k]
    return {...z, [v]: k}
  }, {})
}

// Math ============================================================================================
export let pow = R.curry((a, b) => {
  return a ** b
})

export let powTo = R.flip(pow)

export let round = (num, prec) => {
  return Number(num.toFixed(prec))
}

export let roundTo = R.flip(round)

// M-L =============================================================================================
// {1200: 2, 1450: 1} -> 1200
export let scale = (ns) => {
  let min = R.reduce(R.min, +Infinity, ns)
  let max = R.reduce(R.max, -Infinity, ns)
  return ns.map(n => (n - min) / (max - min))
}

export let getDistance = (record1, record2) => {
  let keys1 = R.keys(record1).filter(k => k != "label")
  let keys2 = R.keys(record2).filter(k => k != "label")
  let uniqKeys = R.uniq([...keys1, ...keys2])
  return R.pipe(
    R.map(k => (record1[k] - record2[k]) ** 2),
    R.sum,
    powTo(0.5),
  )(uniqKeys)
}

export let scaleFacts = (facts) => {
  if (!facts.length) {
    return []
  }

  let scaledValues = R.pipe(
    R.keys,
    R.filter(k => k != "label"),
    R.reduce((z, k) => ({...z, [k]: R.pluck(k, facts)}), {}),
    R.map(x => R.map(roundTo(2), scale(x)))
  )(facts[0])

  return facts.map((fact, i) =>
    R.map((v, k) => k == "label" ? v : scaledValues[k][i], fact)
  )
}

export let splitTestTraining = (allFacts, testCount) => {
  if (testCount > (allFacts.length / 2)) {
    throw new Error("testFacts must take less than a half of allFacts")
  }

  let shuffledFacts = R.shuffle(allFacts)

  return [
    R.take(testCount, shuffledFacts), // testSet
    R.drop(testCount, shuffledFacts), // trainingSet
  ]
}

// KNN algorithm
export let classifyByKNN = (givenFacts, newFact, k = 3) => {
  if (!givenFacts.length) {
    throw new Error("givenFacts can't be empty!")
  }
  if (givenFacts.length < k) {
    throw new Error("givenFacts can't be shorter than K!")
  }

  let [scaledNewFact, ...scaledGivenFacts] = scaleFacts([newFact, ...givenFacts])

  return R.pipe(
    R.map(scaledFact => ({...scaledFact, [DISTANCE]: getDistance(scaledFact, scaledNewFact)})),
    R.sortBy(R.prop(DISTANCE)),
    R.map(R.omit([DISTANCE])),
    R.slice(0, k),
    countBy(R.prop("label")),
    R.toPairs,
    R.sortBy(R.prop("1")),
    R.reverse,
    (ks) => ks[0][0],
  )(scaledGivenFacts)
}

let DISTANCE = Symbol("distance")

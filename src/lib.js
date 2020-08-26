import * as R from "rambda"

// Dev. Helpers ====================================================================================
export let logAs = (label) => {
  return function (x) {
    console.log(label + ":", x)
    return x
  }
}

// Collections =====================================================================================
export let removeIndex = (xs, i) => {
  let ys = [...xs]
  ys.splice(i, 1)
  return ys
}

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

export let digitToDotFive = (n) => {
  if      (n <= 0.33) return 0
  else if (n <= 0.66) return 0.5
  else                return 1
}

export let roundToDotFive = (n) => {
  let remainder = ((n * 10) % 10) / 10
  return round(n - remainder + digitToDotFive(remainder), 1)
}

// M-L =============================================================================================
// {1200: 2, 1450: 1} -> 1200
export let scale = (ns) => {
  let min = R.reduce(R.min, +Infinity, ns)
  let max = R.reduce(R.max, -Infinity, ns)
  return ns.map(n => (n - min) / (max - min))
}

export let getKMean = (stats) => {
  return R.pipe(
    R.toPairs,
    R.sortBy(R.prop("1")),
    R.reverse,
    (ks) => ks[0][0],
  )(stats)
}

export let getDistance = (record1, record2) => {
  let keys1 = R.keys(record1).filter(k => !k.startsWith("@"))
  let keys2 = R.keys(record1).filter(k => !k.startsWith("@"))
  let uniqKeys = R.uniq([...keys1, ...keys2])
  return R.pipe(
    R.map(k => (record1[k] - record2[k]) ** 2),
    R.sum,
    powTo(0.5),
  )(uniqKeys)
}

export let scaleFacts = (facts) => {
  if (!facts.length)
    return []

  let scaledValues = R.pipe(
    R.keys,
    R.filter(k => !k.startsWith("@")),
    R.reduce((z, k) => ({...z, [k]: R.pluck(k, facts)}), {}),
    R.map(x => R.map(roundTo(2), scale(x)))
  )(facts[0])

  return facts.map((fact, i) =>
    R.map((v, k) => k.startsWith("@") ? v : scaledValues[k][i], fact)
  )
}

export let classifyFact = (givenFacts, newFact, k = 3) => {
  if (!givenFacts.length) {
    throw new Error("givenFacts can't be empty!")
  }
  if (givenFacts.length < k) {
    throw new Error("givenFacts can't be shorter than K!")
  }

  let featureKey = R.keys(givenFacts[0]).find(k => k.startsWith("@"))

  let [scaledNewFact, ...scaledGivenFacts] = scaleFacts([newFact, ...givenFacts])

  return R.pipe(
    R.map(scaledFact => ({...scaledFact, [DISTANCE]: getDistance(scaledFact, scaledNewFact)})),
    R.sortBy(R.prop(DISTANCE)),
    R.map(R.omit([DISTANCE])),
    R.slice(0, k),
    countBy(R.prop(featureKey)),
    getKMean,
  )(scaledGivenFacts)
}

let DISTANCE = Symbol("distance")

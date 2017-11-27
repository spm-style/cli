// équivalent de for (let item of list) pour les asynchrones

let loopOf = (list, index, callback) => {
  if (index < list.length) {
    callback(list[index])
		.then(() => loopOf(list, index + 1, callback))
		.catch(console.log)
  }
}

let forOfAsyncPerso = (list, callback) => {
  loopOf(list, 0, callback)
}

let loopIncrement = (start, end, increment, callback) => {
  if (start * increment < end * increment) {
    callback(start)
		.then(() => loopIncrement(start + increment, end, increment, callback))
		.catch(console.log)
  }
}

let forIncrementAsyncPerso = (start, end, increment, callback) => {
  loopIncrement(start, end, increment, callback)
}

let testList = [1, 2, 3, 4]

let test = (data) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log(data)
      resolve()
    }, 2000)
  })
}

// forOfAsyncPerso(testList, test);
forIncrementAsyncPerso(1, 5, 1, test)

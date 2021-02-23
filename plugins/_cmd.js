const Xscr = require('../events')
const Language = require('../language')
const simpleGit = require('simple-git')
const Config = require('../config')
const { infoMessage, errorMessage } = require('../helpers')
const { MessageType } = require('@adiwajshing/baileys')
const Lang = Language.getString('aiscanner')
const ULang = Language.getString('updater')
const git = simpleGit()

function editDistance(s1, s2) {
  s1 = s1.toLowerCase()
  s2 = s2.toLowerCase()

  var costs = new Array()
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0) costs[j] = j
      else {
        if (j > 0) {
          var newValue = costs[j - 1]
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
          costs[j - 1] = lastValue
          lastValue = newValue
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue
  }
  return costs[s2.length]
}

function similarity(s1, s2) {
  var longer = s1
  var shorter = s2
  if (s1.length < s2.length) {
    longer = s2
    shorter = s1
  }
  var longerLength = longer.length
  if (longerLength == 0) {
    return 1.0
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength)
}

let commandTries = 0
const maxCommandTriesForUpdate = 5

async function shouldUpdate() {
  if (commandTries >= maxCommandTriesForUpdate) {
    try {
      await git.fetch()
      var commits = await git.log([Config.BRANCH + '..origin/' + Config.BRANCH])
      if (commits.total === 0) {
        return false
      } else {
        return true
      }
    } catch (err) {
      console.log(err)
    }
  }
}

Xscr.addCommand(
  { pattern: '.*', fromMe: true, dontAddCommandList: true },
  async (message, match) => {
    commandTries += 1
    const needUpdate = await shouldUpdate()

    if (needUpdate) {
      await message.sendMessage(infoMessage(Lang.NEW_UPDATE), MessageType.text)
    }

    const filteredCommandList = Xscr.commands.filter((v) => {
      try {
        if (v.pattern !== undefined) {
          const inputCommand = match.input.replace('.', '')
          const potentialCommand = v.pattern
            .toString()
            .replace('/^[.!;]', '')
            .replace('/', '')
            .replace('/?', '')
            .replace('?', '')
            .replace(new RegExp(/\([^]*\)/g), '')

          if (inputCommand === potentialCommand) {
            return new Array(v)
          }
        }
      } catch (err) {
        console.log(err)
      }
    })

    if (filteredCommandList.length < 1) {
      const similarities = []

      await message.sendMessage(infoMessage(Lang.SEARCHING))

      Xscr.commands.forEach(async (command) => {
        try {
          if (command.pattern !== undefined) {
            const inputCommand = match.input.replace('.', '')
            const potentialCommand = command.pattern
              .toString()
              .replace('/^[.!;]', '')
              .replace('/', '')
              .replace('?(.*)', '')
              .replace('(?: |$)(.*)', '')
            const c = similarity(inputCommand, potentialCommand)

            if (c > 0.5) {
              similarities.push(potentialCommand)
            }
          }
        } catch (err) {
          console.log(err)
        }
      })

      if (similarities.length > 0) {
        await message.sendMessage(Lang.FOUND + similarities.join('\n') + '```')
      } else {
        await message.sendMessage(errorMessage(Lang.NOT_FOUND))
      }
    }
  },
)
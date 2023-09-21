# EvoBot - BenJoe version (Discord Music Bot)

This is my own modified version of [eritislami's music bot](https://github.com/eritislami/evobot), if you want a more user friendly guide or better tutorial you should check out the main repo. This readme mainly focuses on my modifications.

## Features & Command modifications from the main repo

- The repo has a built in logger which creates logs into text files and can be requested via the `logs` command.
- If the bot is somehow stuck you can kill all the instances via the `kill` command.
- The previous 2 commands can only be used by bot owners. If you host the bot yourself you can modifiy the owner name strings in the `checkPermissions.ts` file.
- Other new commands:
  - `priority`: Puts the requested song next in the queue
  - `removefrom`: Removes all songs from the list starting from the index received

## Locales

Because I created and modified commands, this bot only has locale for English. Sorry

## Feedback

Sadly I can not promise to implement all requests, because this is a hobby project for my community but feel free to leave a comment in this repo or report any issues.

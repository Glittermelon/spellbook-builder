/**
 * Jessica May
 * 2/25/22
 * Section AA, TA Max Bi
 *
 * Deals with saving accounts and their respective characters to a database. Allows the user to
 * create an account, create an unlimited number of characters per account, swap between accounts
 * and characters, and save a list of spells to the current character.
 */

"use strict";

const express = require("express");
const app = express();
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');
const multer = require('multer');
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(multer().none());

let usernames = [];
let characters = [];
let currentAccount;
let currentCharacter;
let hasChars = true;

/**
 * Establishes a database connection to the database and returns the database object.
 * Any errors that occur should be caught in the function that calls this one.
 * @returns { Object } - The database object for the connection
 */
async function getDBConnection() {
  const db = await sqlite.open({
    filename: 'dnd-saves.db',
    driver: sqlite3.Database
  });
  return db;
}

/**
 * Gets a list of all existing users and saves it
 */
app.get('/users', async function(req, res) {
  res.type('text');
  try {
    let db = await getDBConnection();
    let results = await db.all('SELECT DISTINCT username FROM accounts;');
    db.close();
    for (let name in results) {
      usernames.push(results[name]['username']);
    }
    res.send('User compilation successful.');
  } catch (err) {
    res.status(500).send('Server error. User compilation failed.');
  }
});

/**
 * Allows a user to create a new account with a unique username. Updates the current account to be
 * the new one, then returns the account information
 */
app.post('/newaccount', function(req, res) {
  hasChars = false;
  let username = req.body.username;
  if (username) {
    if (!usernames.includes(username)) {
      usernames.push(username);
      characters = [];
      currentAccount = username;
      currentCharacter = undefined;
      hasChars = false;
      res.type('json').send({"username": currentAccount});
    } else {
      res.status(400).type("text")
        .send("Account with that username already exists. Please try something else.");
    }
  } else {
    res.status(400).type("text")
      .send("Missing required parameters.");
  }
});

/**
 * Allows the user to log into an existing account by passing in their username.  Updates the
 * current account, then returns the account information
 */
app.get('/login/:username', async function(req, res) {
  if (!hasChars) {
    let index = usernames.indexOf(currentAccount);
    usernames.splice(index, 1);
  }
  hasChars = true;
  try {
    let username = req.params.username;
    if (username) {
      if (username === currentAccount) {
        res.status(400).type("text")
          .send("Already logged into that account.");
      } else if (usernames.includes(username)) {
        let result = await openAccount(username);
        res.type('json').send(result);
      } else {
        res.status(400).type("text")
          .send("No account with that username exists.");
      }
    } else {
      res.status(400).type("text")
        .send("Missing required parameters.");
    }
  } catch (err) {
    res.status(500).type("text")
      .send("Server error encountered while trying to open account.");
  }
});

/**
 * Allows the user to delete an existing account and all the characters in it
 */
app.post('/deleteaccount', async function(req, res) {
  try {
    let db = await getDBConnection();
    let command = "DELETE FROM accounts WHERE username=?";
    await db.all(command, [currentAccount]);
    db.close();
    let name = currentAccount;
    let index = usernames.indexOf(currentAccount);
    if (index > -1) {
      usernames.splice(index, 1);
    }
    currentAccount = undefined;
    currentCharacter = undefined;
    res.type('text').send(`Deleted account ${name}`);
  } catch (err) {
    res.status(500).type('text')
      .send("Server error encountered while attempting to delete this character.");
  }
});

/**
 * Allows a user to create a new character with a name that has not been used in the account yet.
 * Updates the current character to be the new one, then returns the character's information
 */
app.post('/newcharacter', async function(req, res) {
  if (!hasChars) {
    hasChars = true;
  }
  try {
    let properName = req.body['proper_name'];
    let snakeName = req.body['snake_name'];
    if (properName && snakeName) {
      if (!characters.includes(snakeName)) {
        let result = await createChar(snakeName, properName);
        res.type('json').send(result);
      } else {
        res.status(400).type("text")
          .send("Character with that name already exists in your account. Please try another " +
          "name.");
      }
    } else {
      res.status(400).type("text")
        .send("Missing required parameters.");
    }
  } catch (err) {
    res.status(500).type("text")
      .send("Server error encountered while creating this character.");
  }
});

/**
 * Sets the current character to the one whose name is passed in by the user. Returns the current
 * character's information
 */
app.get('/getcharacter/:name', async function(req, res) {
  try {
    let charName = req.params.name;
    if (charName) {
      if (characters.includes(charName)) {
        currentCharacter = charName;
        let db = await getDBConnection();
        let command = "SELECT * FROM accounts WHERE username=? AND snake_name=?;";
        let result = await db.all(command, [currentAccount, currentCharacter]);
        db.close();
        res.type("json").send(result);
      } else {
        res.status(400).type("text")
          .send("Character with that name does not exist.");
      }
    } else {
      res.status(400).type("text")
        .send("Missing required parameters.");
    }
  } catch (err) {
    res.status(500).type('text')
      .send("Server error encountered while attempting to retrieve character.");
  }
});

/**
 * Saves the passed spells, border color, and/or class to the current character
 */
app.post('/savecharacter', async function(req, res) {
  try {
    let spells = req.body['spells'];
    let borderColor = req.body['border_color'];
    let className = req.body['class'];
    let locked = req.body['locked'];
    if (spells === undefined && borderColor === undefined && className === undefined &&
      locked === undefined) {
      res.send("Missing required parameters.");
    } else {
      if (spells !== undefined) {
        await saveCharSpells(spells);
      }
      if (borderColor) {
        await saveCharBorder(borderColor);
      }
      if (className) {
        await saveCharClass(className);
      }
      if (locked !== undefined) {
        await saveCharLock(locked);
      }
      res.type('text').send("Character update successful.");
    }
  } catch (err) {
    console.error(err);
    res.status(500).type('text')
      .send("Server error encountered while attempting to save this character.");
  }
});

app.post('/deletecharacter', async function(req, res) {
  try {
    let db = await getDBConnection();
    let command = "DELETE FROM accounts WHERE username=? AND snake_name=?";
    await db.all(command, [currentAccount, currentCharacter]);
    db.close();
    let result = {
      "character": currentCharacter,
      "username": currentAccount
    };
    currentCharacter = undefined;
    res.type('json').send(result);
  } catch (err) {
    res.status(500).type('text')
      .send("Server error encountered while attempting to delete this character.");
  }
});

/**
 * Sets the current account and available character list, gets all the characters under the logged
 * into account.
 * @param {String} username - the name of the account being logged into
 * @return {Object} all of the selected account's characters
 */
async function openAccount(username) {
  currentAccount = username;
  currentCharacter = undefined;
  let db = await getDBConnection();
  let command1 = "SELECT * FROM accounts WHERE username=?;";
  let result = await db.all(command1, [username]);
  let command2 = "SELECT snake_name FROM accounts WHERE username=?;";
  let result2 = await db.all(command2, [username]);
  db.close();
  characters = [];
  for (let name in result2) {
    characters.push(result2[name]['snake_name']);
  }
  return result;
}

/**
 * Fills in the basic, default information for new characters.
 * @param { String } snakeName - name of the character in snake case
 * @param { String } properName - name of the character in letter case
 */
async function createChar(snakeName, properName) {
  currentCharacter = snakeName;
  characters.push(snakeName);
  let db = await getDBConnection();
  let command1 = "INSERT INTO accounts (username, snake_name, proper_name, border_color, spells, " +
    "class, locked) VALUES (?, ?, ?, \"gold\", null, null, \"false\");";
  await db.all(command1, [currentAccount, snakeName, properName]);
  let command2 = "SELECT * FROM accounts WHERE username=? AND snake_name=?;";
  let result = await db.all(command2, [currentAccount, snakeName]);
  db.close();
  return result;
}

/**
 * Updates the class property of the current character in the database
 * @param {String} value - the character's class
 */
async function saveCharSpells(value) {
  let db = await getDBConnection();
  let command = "UPDATE accounts SET spells=? WHERE username=? AND snake_name=?;";
  await db.all(command, [value, currentAccount, currentCharacter]);
  db.close();
}

/**
 * Updates the class property of the current character in the database
 * @param {String} value - the character's class
 */
async function saveCharBorder(value) {
  let db = await getDBConnection();
  let command = "UPDATE accounts SET border_color=? WHERE username=? AND snake_name=?;";
  await db.all(command, [value, currentAccount, currentCharacter]);
  db.close();
}

/**
 * Updates the class property of the current character in the database
 * @param {String} value - the character's class
 */
async function saveCharClass(value) {
  let db = await getDBConnection();
  let command = "UPDATE accounts SET class=? WHERE username=? AND snake_name=?;";
  await db.all(command, [value, currentAccount, currentCharacter]);
  db.close();
}

/**
 * Updates the class property of the current character in the database
 * @param {String} value - the character's class
 */
async function saveCharLock(value) {
  let db = await getDBConnection();
  let command = "UPDATE accounts SET locked=? WHERE username=? AND snake_name=?;";
  await db.all(command, [value, currentAccount, currentCharacter]);
  db.close();
}

app.use(express.static('public'));
const PORT = process.env.PORT || 8000;
app.listen(PORT);
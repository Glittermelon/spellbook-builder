# Spellbook API Documentation
The Spellbook API allows the user to create an account, create an unlimited number of characters per account, swap between accounts and characters, and save a list of spells to the current character. The API is designed to work in conjuction with a program that has a decorative visual aspect as well (the border color) but this can be ignored if not relevant to your implementation.

## Create An Account
**Request Format:** /newaccount endpoint with POST parameter of `username`. (Although the front end adds restrictions on the types of characters allowed in a username, the API itself does not.)

**Request Type:** POST

**Returned Data Format**: JSON

**Description:** Given a username that has not already been taken, creates an account containing only the passed username. Updates the current account to be the new one. Returns the new account's information.

**Example Request:** /conversation with POST parameter `username=jessi`

**Example Response:**

```json
{
  "username": "jessi"
}
```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If no username is passed, return an error with the message: `Missing required parameters.`
  - If an account with the passed username already exists, return an error with the message: `Account with that username already exists. Please try something else.`

## Log Into Existing Account
**Request Format:** /login/:username

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Given a username that matches an existing account's, updates the current account to be the one associated with the username, then returns that account's information.

**Example Request:** /login/jessi

**Example Response:**
In this example, for demo purposes, the account being returned has a character in it.

```json
{
  "username": "jessi",
  "atara_noh": {
    "snake_name": "atara_noh",
    "proper_name": "Atara Noh",
    "border_color": "gold",
    "spells": ["mending", "acid-arrow"]
  }
}
```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If no username is passed, return an error with the message: `Missing required parameters.`
  - If no account with the passed username exists, return an error with the message: `No account with that username exists.`
  - If the account associated with the passed username is the account currently logged into, return an error with the message: `Already logged into that account.`

## Create New Character
**Request Format:** /newcharacter endpoint with POST parameters of `snake_name`  and `proper_name`. (Although the front end ensures that snake_name is actually in snake case, the API does not.)

**Request Type:** POST

**Returned Data Format**: JSON

**Description:** Adds a new character to the current account based on the passed parameters. Sets character's spells to `[]` and border color to `"gold"` by default. Updates current character to match the new character, then returns the character's information.

**Example Request:** /newcharacter with POST parameters of `snake_name=atara_noh` and `proper_name=Atara Noh`

**Example Response:**

```json
{
 "snake_name": "atara_noh",
  "proper_name": "Atara Noh",
  "border_color": "gold",
  "spells": []
}
```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If there is a missing parameter, return an error with the message: `Missing required parameters.`
  - If the current account already contains a character with the same name as the `snake_name` parameter, return an error with the message: `Character with that name already exists in your account. Please try another name.`

## Open Existing Character's Spellbook
**Request Format:** /getcharacter/:name

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Updates current character to match the character with `name` in the current account. Returns the character's information.

**Example Request:** /getcharacter/atara_noh

**Example Response:**

```json
{
  "snake_name": "atara_noh",
  "proper_name": "Atara Noh",
  "border_color": "gold",
  "spells": []
}
```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If name parameter is missing, return an error with the message: `Missing required parameters.`
  - If the current account does not contain a character with the inputted name, return an error with the message: `Character with that name does not exist.`

## Save Spells to Character
**Request Format:** /savecharacter endpoint with POST parameters of `spells`  and `border_color`.

**Request Type:** POST

**Returned Data Format**: plain text

**Description:** Updates the current character's `spells` to be the passed list of spell index names, and their `border_color` to the passed `border_color`.

**Example Request:** /savecharacter with POST parameters `spells=["mending", "acid-arrow"]` and `border_color="pink"`. Returns a success message.

**Example Response:**

```
  Character update saved!
```

**Error Handling:**
- Possible 400 (invalid request) error (all plain text):
  - If there is a missing parameter, return an error with the message: `Missing required parameters.`
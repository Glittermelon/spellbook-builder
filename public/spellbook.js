/*
 * Jessica May
 * 2/25/22
 * Section AA, TA Max Bi
 *
 * For spellbook.html. Works with the D&D API as well as our own local one. Gives functionality to
 * buttons, generates cards, and deals with errors/error messages. Allows user to create an account,
 * log in,create a character, choose a saved character, and save the spellbook's current state to
 * the currently selected character.
 */

"use strict";

(function() {

  const BASE_URL = "https://www.dnd5eapi.co/api/";
  const BASIC_ERROR = "Uh oh, something went wrong. Make sure your entry is valid and try again!";
  let currentSpellList = [];
  let cardFuncs = {};
  let locked = false;

  window.addEventListener("load", init);

  /**
   * Gives all buttons functionality and assigns a default error message
   */
  function init() {
    id("login-error-msg").textContent = BASIC_ERROR;
    id("char-error-msg").textContent = BASIC_ERROR;
    id("spell-error-msg").textContent = BASIC_ERROR;

    id("login-save").addEventListener("click", logIn);
    id("new-acc-save").addEventListener("click", createAccount);
    id("new-char-save").addEventListener("click", newCharacter);
    id('delete-account').addEventListener("click", deleteAccount);

    id('delete-character').addEventListener("click", deleteCharacter);
    id('char-class-save').addEventListener("click", saveClass);
    id("color-save").addEventListener("click", saveColor);

    id("name-save").addEventListener("click", searchName);
    id("level-save").addEventListener("click", searchLevel);
    id("school-save").addEventListener("click", searchSchool);
    id("class-save").addEventListener("click", searchClass);

    id("clear-library").addEventListener("click", removeUnselected);
    id("clear-spellbook").addEventListener("click", removeSelected);
    id("save-spellbook").addEventListener("click", saveSpells);
    id("lock-spellbook").addEventListener("click", lockSpells);

    getUsers();
  }

  /**
   * Makes request to API for all existing users
   */
  function getUsers() {
    fetch('/users')
      .catch(errorHandlerLogin);
  }

  /**
   *  Removes all cards from the library (the unselected cards)
   */
  function removeUnselected() {
    id("lib-card-cont").innerHTML = "";
  }

  /**
   *  Removes all cards from the spellbook (the selected cards)
   */
  function removeSelected() {
    id("spell-card-cont").innerHTML = "";
  }

  /**
   * Toggle whether or not a card is selected. Moves a card to the library if it becomes unselected
   * or to the spellbook if it becomes selected
   * @param { Object } card - DOM object to select/unselect
   */
  function toggleSelected(card) {
    card.classList.toggle("unselected");
    if (card.classList.contains("unselected")) {
      card.parentNode.removeChild(card);
      id("lib-card-cont").appendChild(card);
    } else {
      card.parentNode.removeChild(card);
      id("spell-card-cont").appendChild(card);
    }
  }

  /**
   * Delete the current account.
   */
  function deleteAccount() {
    let data = new FormData();
    data.append("delete", true);
    fetch('/deleteaccount', {method: "POST", body: data})
      .then(statusCheck)
      .then(res => res.text())
      .then(deleteAccUpdates)
      .catch(errorHandlerLogin);
  }

  /**
   * Helper method for deleting the current account.
   * @param {String} response - the status message from the server
   */
  function deleteAccUpdates(response) {
    errorHandlerLogin(response);
    id('char-div').classList.add('hidden');
    id('delete-account').classList.add('hidden');
    id('character-container').classList.add('hidden');
  }

  /**
   * Delete the current character.
   */
  function deleteCharacter() {
    let data = new FormData();
    data.append("delete", true);
    fetch('/deletecharacter', {method: "POST", body: data})
      .then(statusCheck)
      .then(res => res.json())
      .then(deleteCharUpdates)
      .catch(errorHandlerLogin);
  }

  /**
   * Helper method for deleting a character.
   * @param {Object} response - the name of the deleted character and the account it was removed
   * from
   */
  function deleteCharUpdates(response) {
    errorHandlerLogin(`Deleted ${response.character} from ${response.username}`);
    id('character-container').classList.add('hidden');
    id('char-btns').removeChild(id(response.character));
  }

  /**
   * Adds/removes a spell from the list of spells currently in the spellbook
   * @param { Object } card - card being added/removed
   * @param { String } name - index name of the spell being added/removed
   */
  function updateSpellList(card, name) {
    if (card.classList.contains("unselected")) {
      let index = currentSpellList.indexOf(name);
      if (index > -1) {
        currentSpellList.splice(index, 1);
      }
    } else {
      currentSpellList.push(name);
    }
  }

  // LOGIN/CHARACTER BUTTONS AND REQUESTS

  /**
   * Creates new user account associated with the inputted username. Throws error if username is
   * taken
   */
  function createAccount() {
    resetLoginError();
    let username = id("new-acc-input").value;
    let match = username.match(/[\w.]+/g);
    if (match.includes(username) && username.length >= 3) {
      let user = new FormData();
      user.append("username", username);
      fetch("/newaccount", {method: "POST", body: user})
        .then(statusCheck)
        .then(res => res.json())
        .then(processLogin)
        .catch(errorHandlerLogin);
    } else {
      regexError();
    }
    id("new-acc-input").value = "";
  }

  /**
   * Loads in the user account associated with the inputted username. Throws error if username does
   * not exist
   */
  function logIn() {
    resetLoginError();
    let username = id("login-input").value;
    if (username.length > 0) {
      fetch("/login/" + username)
        .then(statusCheck)
        .then(res => res.json())
        .then(processLogin)
        .catch(errorHandlerLogin);
    }
    id("login-input").value = "";
  }

  /**
   * Loads account onto page. Adds username to welcome message and displays character option
   * buttons. Does NOT clear the library or spellbook
   * @param { Object } response - parsed JSON object representing the user account that's been
   * logged into
   */
  function processLogin(response) {
    id("char-btns").innerHTML = "";
    if (response.username) {
      id("welcome").textContent = `Welcome ${response.username}!`;
    } else {
      id("welcome").textContent = `Welcome ${response[0].username}!`;
      for (let i = 0; i < response.length; i++) {
        createCharButton(response[i]);
      }
    }
    id('welcome').classList.remove('hidden');
    id("char-div").classList.remove("hidden");
    id("delete-account").classList.remove("hidden");
    id('character-container').classList.add('hidden');

  }

  /**
   * Creates a new character under the current account
   */
  function newCharacter() {
    resetLoginError();
    let charName = id("new-char-input").value;
    if (charName.length > 0) {
      let newChar = new FormData();
      newChar.append("proper_name", charName);
      newChar.append("snake_name", snakeify(charName));
      fetch("/newcharacter", {method: "POST", body: newChar})
        .then(statusCheck)
        .then(res => res.json())
        .then(function(res) {
          createCharButton(res[0]);
          updateCurChar(res);
        })
        .catch(errorHandlerLogin);
    }
    id("new-char-input").value = "";
  }

  /**
   * Creates a button for the user's characters
   * @param { Object } character - parsed JSON object representing the user's selected character
   */
  function createCharButton(character) {
    let charButton = gen("button");
    charButton.classList.add("character");
    charButton.id = character['snake_name'];
    charButton.textContent = character['proper_name'];
    charButton.addEventListener("click", function() {
      chooseCharacter(character['snake_name']);
    });
    id("char-btns").appendChild(charButton);
  }

  /**
   * Clears the spellbook and displays the selected character's spells and border color instead
   * @param { String } name - name of the character being fetched by the user
   */
  function chooseCharacter(name) {
    fetch("/getcharacter/" + name)
      .then(statusCheck)
      .then(res => res.json())
      .then(updateCurChar)
      .catch(errorHandlerLogin);
  }

  /**
   * Updates the current character tracker, changes the spellbook header message and border color,
   * And updates the spellbook to contain the selected character's spells
   * @param { Object } response - parsed JSON object representing the current character
   */
  function updateCurChar(response) {
    response = response[0];
    updateNoCalls();
    if (response.locked === "true") {
      lockLoadedSpells();
      locked = true;
    } else {
      locked = false;
    }
    id("spellbook").querySelector("h2").textContent = `${response['proper_name']}'s Spellbook`;
    if (response['class'] === null) {
      id('character-container').querySelector('h3').textContent = `${response['proper_name']}: ` +
      `no class`;
    } else {
      id('character-container').querySelector('h3').textContent = `${response['proper_name']}: ` +
      `${response['class']}`;
      fetchClassInfo(response.class);
    }
    id("spellbook").style.borderColor = response['border_color'];
    let charBtns = id("char-btns").querySelectorAll(".character");
    for (let i = 0; i < charBtns.length; i++) {
      if (charBtns[i].id === response['snake_name']) {
        charBtns[i].classList.add("char-selected");
      } else {
        charBtns[i].classList.remove("char-selected");
      }
    }
    loadCharSpells(response.spells);
  }

  /**
   * Helper function for updateCurChar. Makes all of the changes that don't incorporate the response
   */
  function updateNoCalls() {
    id('character-container').classList.remove('hidden');
    removeSelected();
    clearClassInfo();
    id("save-spellbook").disabled = false;
  }

  /**
   * Helper function for updateCurChar. Adds the information about the character's class's
   * spellcasting abilities to the page
   * @param { Object } response - the spellcasting information from the API
   */
  function loadClassInfo(response) {
    let infoP = gen('p');
    infoP.innerHTML = `<strong>Spellcasting Ability:</strong>
      ${response['spellcasting_ability']['name']}`;
    id('class-info-cont').appendChild(infoP);
    let info = response.info;
    for (let i = 0; i < info.length; i++) {
      infoP = gen('p');
      infoP.innerHTML = `<strong>${info[i].name}:</strong> ${info[i].desc}`;
      id('class-info-cont').appendChild(infoP);
    }
  }

  /**
   * Fetches the API spellcasting information about the character's class
   * @param { String } className - class of the character
   */
  function fetchClassInfo(className) {
    let request = BASE_URL + "classes/" + className;
    fetch(request)
      .then(statusCheck)
      .then(res => res.json())
      .then(function(res) {
        loadClassInfo(res.spellcasting);
      })
      .catch(errorHandlerChar);
  }

  /**
   * Removes all contents from the class information section
   */
  function clearClassInfo() {
    id('class-info-cont').innerHTML = "";
  }

  /**
   * Helper function for updateCurChar. Gets all the spells for the character and loads them into
   * the library
   * @param { Object } spells - list of the character's spells
   */
  function loadCharSpells(spells) {
    if (spells !== null) {
      spells = spells.split(',');
      for (let i = 0; i < spells.length; i++) {
        let request = BASE_URL + "spells/" + spells[i];
        fetch(request)
          .then(statusCheck)
          .then(res => res.json())
          .then(function(res) {
            let spellCard = makeCard(res);
            id("spell-card-cont").appendChild(spellCard);
          })
          .catch(errorHandlerLogin);
      }
    }
  }

  /**
   * Helper function for updateCurChar. If the spellbook is locked, locks the selected cards
   */
  function lockLoadedSpells() {
    let cards = qsa('.spell');
    for (let i = 0; i < cards.length; i++) {
      let cardIndex = cards[i].classList[0];
      cards[i].removeEventListener("click", cardFuncs[cardIndex]);
    }
    id('save-spellbook').disabled = false;
    id('clear-spellbook').disabled = false;
  }

  /**
   * Saves the current spells and border color to the current character
   */
  function saveClass() {
    let charClass = id('char-class-input').value.toLowerCase();
    if (charClass.length > 0) {
      resetCharError();
      let charData = new FormData();
      charData.append("class", charClass);
      fetch("/savecharacter", {method: "POST", body: charData})
        .then(statusCheck)
        .then(function() {
          changeCharHead(charClass);
        })
        .catch(errorHandlerChar);
    }
    clearClassInfo();
    fetchClassInfo(charClass);
    id('char-class-input').value = "";
    clearClassInfo();
  }

  /**
   * Updates the header on the character container to include the correct class
   * @param { String } charClass - the character's updated class
   */
  function changeCharHead(charClass) {
    let nameHead = id('character-container').querySelector('h3');
    let charName = nameHead.textContent.split(':');
    nameHead.textContent = charName[0] + ": " + nameify(charClass);
  }

  /**
   * Adds or removes event listeners from cards, preventing them from being- or allowing them to be-
   * moved around
   */
  function lockSpells() {
    let cards = qsa('.spell');
    for (let i = 0; i < cards.length; i++) {
      let cardIndex = cards[i].classList[0];
      if (!locked) {
        cards[i].removeEventListener("click", cardFuncs[cardIndex]);
      } else {
        cards[i].addEventListener("click", cardFuncs[cardIndex]);
      }
    }
    if (!locked) {
      id('save-spellbook').disabled = true;
      id('clear-spellbook').disabled = true;
    } else {
      id('save-spellbook').disabled = false;
      id('clear-spellbook').disabled = false;
    }
    locked = !locked;
    let data = new FormData();
    data.append("locked", locked);
    fetch('/savecharacter', {method: "POST", body: data})
      .then(statusCheck)
      .catch(errorHandlerChar);
  }

  /**
   * Allows user to change the color of the spellbook's border via inputting a hex code or color
   * name
   */
  function saveColor() {
    let color = id("color-input").value;
    if (color.length > 0) {
      resetCharError();
      let charData = new FormData();
      charData.append("border_color", color);
      fetch("/savecharacter", {method: "POST", body: charData})
        .then(statusCheck)
        .catch(errorHandlerChar);
      id("spellbook").style.borderColor = id("color-input").value;
      id("color-input").value = "";
    }
  }

  // SPELL BLOCK BUTTONS AND REQUESTS

  /**
   *  Make a request for the spell with the user-specified name
   */
  function searchName() {
    resetError();
    let nameInput = id("name-input").value.trim();
    if (nameInput.length > 0) {
      let extension = nameInput.replace(/\W/g, '-').toLowerCase();
      makeIndexRequest("spells/" + extension);
    }
    id("name-input").value = "";
  }

  /**
   *  Make a request to the D&D API for all spells of a specified level
   */
  function searchLevel() {
    resetError();
    let levelInput = id("level-input").value.trim();
    if (levelInput && (id("level-input").min <= levelInput && levelInput <=
    id("level-input").max)) {
      makeGroupRequest(BASE_URL + "spells?level=" + levelInput);
    } else {
      errorHandlerLevel();
    }
    id("level-input").value = "";
  }

  /**
   *  Make a request to the D&D API for all spells of a specified school of magic
   */
  function searchSchool() {
    resetError();
    let schoolInput = id("school-input").value.trim();
    if (schoolInput.length > 0) {
      makeGroupRequest(BASE_URL + "spells?school=" + schoolInput);
    }
    id("school-input").value = "";
  }

  /**
   *  Make a request to the D&D API for all spells available to a specified class
   */
  function searchClass() {
    resetError();
    let classInput = id("class-input").value.trim().toLowerCase();
    if (classInput.length > 0) {
      makeGroupRequest(BASE_URL + "classes/" + classInput + "/spells");
    }
    id("class-input").value = "";
  }

  /**
   * Helper method to make a request to the D&D API for the spell with the user-specified name
   * @param { string } extension - API url extension to find spell of specified index/name
   */
  function makeIndexRequest(extension) {
    let request = BASE_URL + extension;
    fetch(request)
      .then(statusCheck)
      .then(res => res.json())
      .then(function(res) {
        let spellCard = makeCard(res);
        id("lib-card-cont").appendChild(spellCard);
      })
      .catch(errorHandlerSpells);
  }

  /**
   * Helper method to make a request to the D&D API for all spells of the specified level, school,
   * or class
   * @param { string } request - API url to find spells of specified level, school, or class
   */
  function makeGroupRequest(request) {
    fetch(request)
      .then(statusCheck)
      .then(res => res.json())
      .then(processGroupRes)
      .catch(errorHandlerSpells);
  }

  /**
   *  For each spell in the list received, make a card
   * @param { Object } response - - the JSON object representing the list of spells to make cards
   */
  function processGroupRes(response) {
    let spellList = response.results;
    for (let i = 0; i < spellList.length; i++) {
      let extension = "spells/" + spellList[i].index;
      makeIndexRequest(extension);
    }
  }

  /**
   * Formats the given JSON object into a spell card to be displayed. Card can be selected/
   * unselected, moving it between the library and spellbook sections
   * @param { Object } response - JSON object representing a spell
   * @returns { Object } new card representing the spell
   */
  function makeCard(response) {
    let newCard = gen("div");
    newCard.classList.add(response.index, "spell", "unselected");
    if (!cardFuncs[response.index]) {
      cardFuncs[response.index] = function() {
        toggleSelected(newCard);
        updateSpellList(newCard, response.index);
      };
    }
    if (!locked) {
      newCard.addEventListener("click", cardFuncs[response.index]);
    }
    writeKeys(newCard, response);
    return newCard;
  }

  /**
   * Writes spell info onto card
   * @param {*} newCard - card to be filled out
   * @param {*} response - info to add to card
   */
  function writeKeys(newCard, response) {
    for (let [key, value] of Object.entries(response)) {
      if (key === "name") {
        writeName(newCard, value);
      } else if (key === "desc" || key === "higher_level") {
        writeMultitext(newCard, value);
      } else if (key === "components") {
        writeComponent(newCard, key, value);
      } else if (key === "level" && value === "0") {
        writeProperty(newCard, key, "Cantrip");
      } else if (key === "school") {
        writeProperty(newCard, key, value.name);
      } else if (key === "damage") {
        writeProperty(newCard, "Damage Type", value.damage_type.name);
      } else if (!(key === "_id" || key === "index" || key === "url" || value === false)) {
        writeProperty(newCard, key, value);
      }
    }
  }

  /**
   * Helper method for makeCard. Used for writing the spell header/name
   * @param { Object } newCard - the card to write the description onto
   * @param { String } value - the name of the spell
   */
  function writeName(newCard, value) {
    let title = gen("h3");
    title.textContent = value;
    newCard.appendChild(title);
  }

  /**
   * Helper method for makeCard. Used for writing the spell description or at higher level info
   * @param { Object } newCard - the card to write the description onto
   * @param { String } value - the description of the spell/what it does at higher levels
   */
  function writeMultitext(newCard, value) {
    for (let j = 0; j < value.length; j++) {
      let text = gen("p");
      let content = document.createTextNode(value[j]);
      text.appendChild(content);
      newCard.appendChild(text);
    }
  }

  /**
   * Helper method for makeCard. Used for writing the spell component info
   * @param { Object } newCard - the card to write the description onto
   * @param { String } key - the property of the spell being described (component)
   * @param { String } value - the description of the spell component
   */
  function writeComponent(newCard, key, value) {
    let text = gen("p");
    let property = gen("strong");
    property.textContent = nameify(key) + ": ";
    text.appendChild(property);
    text.appendChild(document.createTextNode(value[0]));
    for (let i = 1; i < value.length; i++) {
      text.appendChild(document.createTextNode(", " + value[i]));
    }
    newCard.appendChild(text);
  }

  /**
   * Helper method for makeCard. Catch-all that generates and formats the actual text.
   * @param { Object } newCard - the card to add the spell info to
   * @param { String } key - the name of the next spell property
   * @param { String } value - the information about the next spell property
   */
  function writeProperty(newCard, key, value) {
    if (!(typeof value === "object")) {
      let text = gen("p");
      let property = gen("strong");
      property.textContent = nameify(key) + ": ";
      let content = document.createTextNode(value);
      text.appendChild(property);
      text.appendChild(content);
      newCard.appendChild(text);
    }
  }

  /**
   * Saves the current spells and border color to the current character
   */
  function saveSpells() {
    let charData = new FormData();
    charData.append("spells", currentSpellList);
    fetch("/savecharacter", {method: "POST", body: charData})
      .then(statusCheck)
      .catch(errorHandlerChar);
  }

  // SPELL ERROR HANDLERS

  /**
   * Resets the spell error message to a generic one for when something goes wrong with a search
   */
  function resetError() {
    id("spell-error-msg").textContent = BASIC_ERROR;
    id("spell-error-msg").classList.add("hidden");
  }

  /**
   * Error handler for if the entered level is not within range
   */
  function errorHandlerLevel() {
    id("spell-error-msg").textContent = "D&D 5e spells are levels 0-9. Please enter a valid " +
    "number and try again!";
    id("spell-error-msg").classList.remove("hidden");
  }

  /**
   * Error handler for if something goes wrong wih generating a cards based on search terms
   */
  function errorHandlerSpells() {
    id("spell-error-msg").classList.remove("hidden");
  }

  // LOGIN ERROR HANDLERS

  /**
   *  Resets the login error message to a generic one
   */
  function resetLoginError() {
    id("login-error-msg").textContent = BASIC_ERROR;
    id("login-error-msg").classList.add("hidden");
  }

  /**
   * Error handler for if new account name doesn't match regex requirement
   */
  function regexError() {
    id("login-error-msg").textContent = "Username must be 3+ characters long and may only " +
    "contain letters, numbers, periods, and underscores";
    id("login-error-msg").classList.remove("hidden");
  }

  /**
   * Error handler for if something goes wrong with creating/logging into an account or
   * creating/selecting a character
   * @param { Object } response - server error response
   */
  function errorHandlerLogin(response) {
    id("login-error-msg").textContent = response;
    id("login-error-msg").classList.remove("hidden");
  }

  // LOGIN ERROR HANDLERS

  /**
   *  Resets the login error message to a generic one
   */
  function resetCharError() {
    id("char-error-msg").textContent = BASIC_ERROR;
    id("char-error-msg").classList.add("hidden");
  }

  /**
   * Error handler for if something goes wrong with updating character settings
   * @param { Object } response - server error response
   */
  function errorHandlerChar(response) {
    id("char-error-msg").textContent = response;
    id("char-error-msg").classList.remove("hidden");
  }

  // COPIED AND GENERAL HELPER METHODS

  /**
   * Checks if the status of the parameter is ok, and throws an error if it isn't
   * @param { Object } response - JSON object
   * @returns { Object } - same JSON object as inputted, no changes
   */
  async function statusCheck(response) {
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response;
  }

  /**
   * Formats a snake case string into a letter case string
   * @param { String } str - a string in snake case
   * @returns { String } the same input string but in letter case
   */
  function nameify(str) {
    if (str === "desc") {
      return "Description";
    }
    let pieces = str.split('_');
    for (let i = 0; i < pieces.length; i++) {
      pieces[i] = pieces[i].charAt(0).toUpperCase() + pieces[i].slice(1);
    }
    pieces = pieces.join(' ');
    return pieces;
  }

  /**
   * Formats the inputted string into snake case
   * @param { String } str - a string to be turned into snake case
   * @return { String } - a snake case version of the inputted string
   */
  function snakeify(str) {
    return str.toLowerCase().replace('/ /g');
  }

  /**
   * Finds element with the specified ID attribute.
   * @param { string } id - element ID
   * @return { object } DOM object associated with ID
   */
  function id(id) {
    return document.getElementById(id);
  }

  /**
   * Generates a new DOM element of specified type.
   * @param { string } type - element type
   * @returns { object } new DOM element of the type specified by parameter
   */
  function gen(type) {
    return document.createElement(type);
  }

  /**
   * Finds all elements of the specified type.
   * @param { string } type - element type
   * @return { object } all DOM objects of specified type
   */
  function qsa(type) {
    return document.querySelectorAll(type);
  }
})();
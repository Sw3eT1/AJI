const BIN_ID = '68fcfc61d0ea881f40bb3184';
const API_KEY = '$2a$10$UfZ4hW99G4WeXM6YCi9usOAIzwMUoEWNyJHpObNEj/hKulP3wXipW';
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

const GROQ_API_KEY = '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'; 
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

let todoList = [];

let initList = function () {
    const req = new XMLHttpRequest();
    req.onreadystatechange = function () {
        if (req.readyState === XMLHttpRequest.DONE) {
            if (req.status === 200) {
                const response = JSON.parse(req.responseText);
                todoList = response.record || [];
                updateTodoList();
                console.log("Loaded todos from JSONBin");
            } else {
                console.error("Error loading data from JSONBin:", req.status);
            }
        }
    };
    req.open("GET", `${BIN_URL}/latest`, true);
    req.setRequestHeader("X-Master-Key", API_KEY);
    req.send();
};

let updateJSONbin = function () {
    const req = new XMLHttpRequest();
    req.onreadystatechange = function () {
        if (req.readyState === XMLHttpRequest.DONE) {
            if (req.status === 200) {
                console.log("JSONBin updated successfully");
            } else {
                console.error("Error updating JSONBin:", req.status);
            }
        }
    };
    req.open("PUT", BIN_URL, true);
    req.setRequestHeader("Content-Type", "application/json");
    req.setRequestHeader("X-Master-Key", API_KEY);
    req.send(JSON.stringify(todoList));
};

let updateTodoList = function () {
    const tableBody = document.querySelector("#todoListView tbody");
    const filterValue = document.getElementById("inputSearch").value.toLowerCase();

    const filterFrom = document.getElementById("filterFrom").value;
    const filterTo = document.getElementById("filterTo").value;

    const fromDate = filterFrom ? new Date(filterFrom) : null;
    const toDate = filterTo ? new Date(filterTo) : null;

    tableBody.innerHTML = "";

    const filteredTodos = todoList.filter(todo => {
        const titleMatch =
            todo.title.toLowerCase().includes(filterValue) ||
            todo.description.toLowerCase().includes(filterValue) ||
            filterValue === "";

        const todoDate = new Date(todo.dueDate);
        const fromMatch = fromDate ? todoDate >= fromDate : true;
        const toMatch = toDate ? todoDate <= toDate : true;

        return titleMatch && fromMatch && toMatch;
    });

    filteredTodos.forEach((todo) => {
        const row = document.createElement("tr");

        const tdTitle = document.createElement("td");
        tdTitle.textContent = todo.title;
        row.appendChild(tdTitle);

        const tdDesc = document.createElement("td");
        tdDesc.textContent = todo.description;
        row.appendChild(tdDesc);

        const tdPlace = document.createElement("td");
        tdPlace.textContent = todo.place;
        row.appendChild(tdPlace);

        const tdCategory = document.createElement("td");
        tdCategory.textContent = todo.category || 'Brak'; 
        row.appendChild(tdCategory);

        const tdDate = document.createElement("td");
        const date = new Date(todo.dueDate);
        tdDate.textContent = date.toLocaleDateString();
        row.appendChild(tdDate);

        const tdAction = document.createElement("td");
        const btnDelete = document.createElement("button");
        btnDelete.textContent = "Delete";
        btnDelete.className = "btn btn-sm btn-danger";
        btnDelete.onclick = () => deleteTodo(todoList.indexOf(todo));
        tdAction.appendChild(btnDelete);
        row.appendChild(tdAction);

        tableBody.appendChild(row);
    });
};

/**
 * Używa API Groq do automatycznej kategoryzacji zadania.
 * @param {string} title Tytuł zadania
 * @param {string} description Opis zadania
 * @returns {Promise<string>} Nazwa kategorii (np. "Uczelnia", "Domowe", "Praca", "Inne")
 */
async function getCategoryFromGroq(title, description) {

    const payload = {
        model: "llama-3.1-8b-instant", 
        messages: [
            {
                role: "system",
                content: "Jesteś asystentem kategoryzującym. Twoim zadaniem jest przypisanie zadania do jednej z czterech kategorii: Uczelnia, Domowe, Praca, Inne. Twoja odpowiedź musi składać się *tylko i wyłącznie* z jednego słowa będącego nazwą kategorii (np. 'Uczelnia')."
            },
            {
                role: "user",
                content: `Sklasyfikuj to zadanie:\nTytuł: ${title}\nOpis: ${description}`
            }
        ],
        temperature: 0.0, 
        max_tokens: 10
    };

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.json(); 
            console.error("Szczegółowa odpowiedź błędu z Groq:", errorBody);
            const errorMessage = errorBody.error ? errorBody.error.message : `HTTP status ${response.status}`;
            throw new Error(`Błąd API Groq: ${errorMessage}`);
        }

        const data = await response.json();
        const category = data.choices[0].message.content.trim().replace(/[".,]/g, ''); 
        
        const validCategories = ["Uczelnia", "Domowe", "Praca", "Inne"];
        
        if (validCategories.includes(category)) {
            console.log(`Groq skategoryzował jako: ${category}`);
            return category;
        } else {
            console.warn(`Groq zwrócił nieoczekiwaną kategorię: "${category}". Używam "Inne".`);
            return "Inne"; 
        }

    } catch (error) {
        console.error("Błąd podczas pobierania kategorii z Groq:", error);
        return "Inne"; 
    }
}

let deleteTodo = function (index) {
    todoList.splice(index, 1);
    updateJSONbin();
    updateTodoList();
};

let addTodo = async function () { 
    const inputTitle = document.getElementById("inputTitle");
    const inputDescription = document.getElementById("inputDescription");
    const inputPlace = document.getElementById("inputPlace");
    const inputDate = document.getElementById("inputDate");

    if (!inputTitle.value.trim() || !inputDate.value) {
        alert("Please fill in both the title and due date!");
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(inputDate.value);
    if (selectedDate < today) {
        alert("You cannot select a date in the past!");
        return;
    }


    const title = inputTitle.value;
    const description = inputDescription.value;
    
  
    const addButton = document.querySelector("#inputForm button[type='submit']");
    addButton.disabled = true;
    addButton.textContent = "Kategoryzuję...";


    const category = await getCategoryFromGroq(title, description);

   
    addButton.disabled = false;
    addButton.textContent = "Add";

    
    const newTodo = {
        title: title,
        description: description,
        place: inputPlace.value,
        category: category, 
        dueDate: selectedDate
    };
   

    todoList.push(newTodo);
    document.getElementById("inputForm").reset();
    updateJSONbin();
    updateTodoList();
};

document.getElementById("inputForm").addEventListener("submit", async function(event) { 
    event.preventDefault();
    await addTodo(); 
});

window.addEventListener("DOMContentLoaded", () => {
    const inputDate = document.getElementById("inputDate");
    inputDate.min = new Date().toISOString().split("T")[0];
    initList();
});

setInterval(updateTodoList, 1000);

let todoList = [];

let initList = function () {
    let savedList = window.localStorage.getItem("todos");
    if (savedList) {
        todoList = JSON.parse(savedList);
    } else {
        todoList.push(
            {
                title: "Learn JS",
                description: "Create a demo application for my TODOs",
                place: "445",
                category: '',
                dueDate: new Date(2024, 10, 16)
            },
            {
                title: "Lecture test",
                description: "Quick test from the first three lectures",
                place: "F6",
                category: '',
                dueDate: new Date(2024, 10, 17)
            }
        );
    }
};

initList();

document.getElementById("inputForm").addEventListener("submit", function(event) {
    event.preventDefault();
    addTodo();
});

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


setInterval(updateTodoList, 1000);

let deleteTodo = function (index) {
    todoList.splice(index, 1);
    window.localStorage.setItem("todos", JSON.stringify(todoList));
    updateTodoList();
};

let addTodo = function () {
    const inputTitle = document.getElementById("inputTitle");
    const inputDescription = document.getElementById("inputDescription");
    const inputPlace = document.getElementById("inputPlace");
    const inputDate = document.getElementById("inputDate");

    const newTodo = {
        title: inputTitle.value,
        description: inputDescription.value,
        place: inputPlace.value,
        category: '',
        dueDate: new Date(inputDate.value)
    };

    todoList.push(newTodo);
    document.getElementById("inputForm").reset();
    window.localStorage.setItem("todos", JSON.stringify(todoList));
    updateTodoList();
};

window.addEventListener("DOMContentLoaded", () => {
    const inputDate = document.getElementById("inputDate");

    inputDate.min = new Date().toISOString().split("T")[0];
});


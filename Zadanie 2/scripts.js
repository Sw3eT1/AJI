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

let updateTodoList = function () {
    const tableBody = document.querySelector("#todoListView tbody");
    const filterValue = document.getElementById("inputSearch").value.toLowerCase();

    // clear table
    tableBody.innerHTML = "";

    todoList.forEach((todo, index) => {
        if (
            filterValue === "" ||
            todo.title.toLowerCase().includes(filterValue) ||
            todo.description.toLowerCase().includes(filterValue)
        ) {
            const row = document.createElement("tr");

            // title
            const tdTitle = document.createElement("td");
            tdTitle.textContent = todo.title;
            row.appendChild(tdTitle);

            // description
            const tdDesc = document.createElement("td");
            tdDesc.textContent = todo.description;
            row.appendChild(tdDesc);

            // place
            const tdPlace = document.createElement("td");
            tdPlace.textContent = todo.place;
            row.appendChild(tdPlace);

            // due date
            const tdDate = document.createElement("td");
            const date = new Date(todo.dueDate);
            tdDate.textContent = date.toLocaleDateString();
            row.appendChild(tdDate);

            // delete button
            const tdAction = document.createElement("td");
            const btnDelete = document.createElement("button");
            btnDelete.textContent = "Delete";
            btnDelete.className = "btn btn-sm btn-danger";
            btnDelete.onclick = () => deleteTodo(index);
            tdAction.appendChild(btnDelete);
            row.appendChild(tdAction);

            tableBody.appendChild(row);
        }
    });
};

// Refresh every 1s
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

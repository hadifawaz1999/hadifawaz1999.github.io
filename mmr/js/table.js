
function initTableView() {
// loading the table view of the comics dataset
$(document).ready(function () {

    $.getJSON("data/comics.json", function (data) {

        data.sort((a, b) => a.id_order - b.id_order);

        const table_body = document.getElementById("comics-table-view");

        var table_row;

        var id_col, series_col, type_col, years_col, age_col, writer_col, pages_col, rating_col, issues_col, tags_col, char_col;

        var years_text;
        var tags_text;

        var button;

        for (var i = 0; i < data.length; i++) {

            years_text = "";
            tags_text = "";

            table_row = document.createElement("tr");

            id_col = document.createElement("td");
            series_col = document.createElement("td");
            type_col = document.createElement("td");
            years_col = document.createElement("td");
            age_col = document.createElement("td");
            writer_col = document.createElement("td");
            pages_col = document.createElement("td");
            char_col = document.createElement("td");
            rating_col = document.createElement("td");
            issues_col = document.createElement("td");
            tags_col = document.createElement("td");

            if (data[i].year_start == data[i].year_end) {
                years_text = data[i].year_start;
            }
            else {
                years_text = data[i].year_start + " - " + data[i].year_end;
            }

            for (var j = 0; j < data[i].tags.length; j++) {
                tags_text = tags_text + data[i].tags[j];
                if (j < data[i].tags.length - 1) {
                    tags_text = tags_text + ", ";
                }
            }

            id_col.textContent = data[i].id_order;
            table_row.appendChild(id_col);

            series_col.textContent = data[i].series;
            table_row.appendChild(series_col);

            type_col.textContent = data[i].type;
            table_row.appendChild(type_col);

            years_col.textContent = years_text;
            table_row.appendChild(years_col);

            age_col.textContent = data[i].age;
            table_row.appendChild(age_col);

            writer_col.textContent = data[i].writer;
            table_row.appendChild(writer_col);

            characters_button = document.createElement("button");
            characters_button.textContent = "Click to view";
            characters_button.addEventListener("click", ((characters) => {
                return () => openCharsModal(characters);
            })(data[i].characters));
            char_col.appendChild(characters_button);
            table_row.appendChild(char_col);

            pages_col.textContent = data[i].pages;
            table_row.appendChild(pages_col);

            // issues_col.textContent = data[i].issues + " ";
            issues_button = document.createElement("button");
            issues_button.textContent = `${data[i].issues}`;
            issues_button.addEventListener("click", ((urls) => {
                return () => openIssuesModal(urls);
            })(data[i].urls));
            issues_col.appendChild(issues_button);
            table_row.appendChild(issues_col);
            
            rating_col.textContent = data[i].rating;
            table_row.appendChild(rating_col);

            tags_col.textContent = tags_text;
            table_row.appendChild(tags_col);

            table_body.appendChild(table_row);
        }

    });

});
}

function openIssuesModal(urls_dict) {
    let issues_html = "";

    const all_issues = Object.keys(urls_dict).sort((a,b) => {
        return parseInt(a.slice(7)) - parseInt(b.slice(7));
    });

    for (let i = 0; i < all_issues.length; i++) {
        const issue_id = all_issues[i];
        const issue_url = urls_dict[issue_id];

        issues_html += `<a href="${issue_url}" target="_blank">${issue_id}</a>`;

        if (i < all_issues.length - 1) {
            issues_html = issues_html + " ";
        }
    }

    document.getElementById("issues-modalText").innerHTML = issues_html;
    document.getElementById("issues-modal-overlay").style.display = "block";

    const modal = document.getElementById("issues-modal");
    modal.style.display = "block";
    setTimeout(() => modal.classList.add("show"), 10);
}

function openCharsModal(chars_list) {
    $.getJSON("data/chars.json", function (chars_data){

        let chars_html = "";
        for (var i = 0; i < chars_list.length; i++){
            const char_name = chars_list[i];
            const char_url = chars_data[char_name];
            
            if (char_url){
                chars_html += `<a href="${char_url}" target="_blank">${char_name}</a>`;
            }
            else{
                chars_html += char_name;
            }

            if (i < chars_list.length - 1){
                chars_html = chars_html + " ";
            }
        }
        document.getElementById("characters-modalText").innerHTML = chars_html;
        document.getElementById("characters-modal-overlay").style.display = "block";

        const modal = document.getElementById("characters-modal");
        modal.style.display = "block";
        setTimeout(() => modal.classList.add("show"), 10);
    });
}

function closeTableCharsModal() {
    const modal = document.getElementById("characters-modal");
    modal.classList.remove("show");

    setTimeout(() => {
        modal.style.display = "none";
        document.getElementById("characters-modal-overlay").style.display = "none";
    }, 10);
}

function closeTableIssuesModal() {
    const modal = document.getElementById("issues-modal");
    modal.classList.remove("show");

    setTimeout(() => {
        modal.style.display = "none";
        document.getElementById("issues-modal-overlay").style.display = "none";
    }, 10);
}
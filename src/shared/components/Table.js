export function createTable(options) {
    const { columns, data, sortable = true, filterable = false, searchable = false, searchKeys = [], emptyMessage = 'Nenhum dado encontrado', rowClick, className = '', striped = true, hoverable = true, } = options;
    let currentData = [...data];
    let sortField = null;
    let sortAsc = true;
    let searchQuery = '';
    const container = document.createElement('div');
    container.className = `table-container ${className}`.trim();
    if (searchable) {
        const searchWrapper = document.createElement('div');
        searchWrapper.className = 'table-search-wrapper';
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'table-search-input';
        searchInput.placeholder = '🔍 Buscar...';
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            filterAndRender();
        });
        searchWrapper.appendChild(searchInput);
        container.appendChild(searchWrapper);
    }
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    const table = document.createElement('table');
    table.className = `data-table ${striped ? 'striped' : ''} ${hoverable ? 'hoverable' : ''}`;
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.header;
        if (col.width)
            th.style.width = col.width;
        if (col.className)
            th.className = col.className;
        if (sortable && col.sortable) {
            th.classList.add('sortable');
            th.addEventListener('click', () => handleSort(col.key));
        }
        if (filterable && col.filterable) {
            th.classList.add('filterable');
        }
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
    const emptyState = document.createElement('div');
    emptyState.className = 'table-empty hidden';
    emptyState.textContent = emptyMessage;
    container.appendChild(emptyState);
    function handleSort(field) {
        if (sortField === field) {
            sortAsc = !sortAsc;
        }
        else {
            sortField = field;
            sortAsc = true;
        }
        updateSortIndicators();
        filterAndRender();
    }
    function updateSortIndicators() {
        table.querySelectorAll('th.sortable').forEach(th => {
            th.classList.remove('sorted', 'asc', 'desc');
        });
        if (sortField) {
            const colIndex = columns.findIndex(c => c.key === sortField);
            if (colIndex >= 0) {
                const th = headerRow.children[colIndex];
                th.classList.add('sorted', sortAsc ? 'asc' : 'desc');
            }
        }
    }
    function filterData() {
        let filtered = [...currentData];
        if (searchQuery) {
            const keys = searchKeys.length > 0 ? searchKeys : columns.map(c => c.key);
            filtered = filtered.filter(row => keys.some(key => {
                const value = row[key];
                return value != null && String(value).toLowerCase().includes(searchQuery);
            }));
        }
        if (sortField) {
            filtered.sort((a, b) => {
                const aVal = a[sortField];
                const bVal = b[sortField];
                let cmp = 0;
                if (aVal == null && bVal == null)
                    cmp = 0;
                else if (aVal == null)
                    cmp = 1;
                else if (bVal == null)
                    cmp = -1;
                else if (typeof aVal === 'number' && typeof bVal === 'number')
                    cmp = aVal - bVal;
                else
                    cmp = String(aVal).localeCompare(String(bVal));
                return sortAsc ? cmp : -cmp;
            });
        }
        return filtered;
    }
    function renderRows() {
        const filtered = filterData();
        if (filtered.length === 0) {
            tbody.innerHTML = '';
            table.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }
        table.classList.remove('hidden');
        emptyState.classList.add('hidden');
        tbody.innerHTML = filtered.map(row => {
            const tr = document.createElement('tr');
            if (rowClick) {
                tr.classList.add('clickable');
                tr.addEventListener('click', () => rowClick(row));
            }
            columns.forEach(col => {
                const td = document.createElement('td');
                const key = col.key;
                const value = row[key];
                if (col.render) {
                    const rendered = col.render(value, row);
                    if (typeof rendered === 'string') {
                        td.innerHTML = rendered;
                    }
                    else {
                        td.appendChild(rendered);
                    }
                }
                else {
                    td.textContent = value == null ? '—' : String(value);
                }
                if (col.className)
                    td.className = col.className;
                tr.appendChild(td);
            });
            return tr.outerHTML;
        }).join('');
        if (rowClick) {
            tbody.querySelectorAll('tr.clickable').forEach((tr, i) => {
                tr.addEventListener('click', () => rowClick(filtered[i]));
            });
        }
    }
    function filterAndRender() {
        renderRows();
        updateSortIndicators();
    }
    function setData(newData) {
        currentData = [...newData];
        filterAndRender();
    }
    function getData() {
        return filterData();
    }
    function destroy() {
        container.remove();
    }
    filterAndRender();
    return Object.assign(container, { setData, getData, destroy });
}

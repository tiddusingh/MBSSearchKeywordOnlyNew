// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const resultCount = document.getElementById('resultCount');
const resultsList = document.getElementById('resultsList');
const pagination = document.getElementById('pagination');
const initialMessage = document.getElementById('initialMessage');
const loadingResults = document.getElementById('loadingResults');
const noResults = document.getElementById('noResults');
const categoryFilters = document.getElementById('categoryFilters');
const groupFilters = document.getElementById('groupFilters');
const subgroupFilters = document.getElementById('subgroupFilters');
const topicFilters = document.getElementById('topicFilters');
const clearFiltersButton = document.getElementById('clearFilters');
const itemDetailsContent = document.getElementById('itemDetailsContent');

// State management
let currentState = {
    searchTerm: '',
    currentPage: 1,
    filters: {
        CATEGORY_DESCRIPTION: [],
        GROUP_DESCRIPTION: [],
        SUBGROUP_DESCRIPTION: [],
        Topic: []
    },
    facets: {},
    totalResults: 0
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    clearFiltersButton.addEventListener('click', clearAllFilters);
    
    // Initialize facets on page load
    fetchFacets();
    
    // Perform default search on page load
    performDefaultSearch();
});

// Perform default search
function performDefaultSearch() {
    // Set default search term to "*" to get all results
    currentState.searchTerm = "*";
    
    // Show loading state
    showLoadingState();
    
    // Perform search with sorting by ITEM_NUMBER desc (as a fallback since we couldn't verify ITEM_START_DATE)
    performSearchWithParams("*", "ITEM_NUMBER desc");
}

// Perform search with custom parameters
async function performSearchWithParams(searchTerm, orderBy) {
    try {
        // Build filter string for Azure Search
        const filterExpressions = [];
        
        Object.keys(currentState.filters).forEach(facet => {
            if (currentState.filters[facet].length > 0) {
                // Log the facet name and values for debugging
                console.log(`Applying filter for ${facet}:`, currentState.filters[facet]);
                
                const facetFilters = currentState.filters[facet].map(value => 
                    `${facet} eq '${value.replace(/'/g, "''")}'`
                );
                filterExpressions.push(`(${facetFilters.join(' or ')})`);
            }
        });
        
        const filterString = filterExpressions.length > 0 ? filterExpressions.join(' and ') : '';
        
        // Calculate skip value for pagination
        const skip = (currentState.currentPage - 1) * config.searchParams.resultsPerPage;
        
        // Build request body
        const requestBody = {
            search: searchTerm,
            searchMode: "any",
            queryType: "simple",
            searchFields: config.searchParams.searchFields.join(","),
            select: config.searchParams.selectFields.join(','),
            count: true,
            top: config.searchParams.resultsPerPage,
            skip: skip
        };
        
        // Add orderBy if provided
        if (orderBy) {
            requestBody.orderby = orderBy;
        }
        
        // Add facets if needed
        if (config.searchParams.facetFields && config.searchParams.facetFields.length > 0) {
            requestBody.facets = config.searchParams.facetFields;
        }
        
        // Add filter if present
        if (filterString) {
            requestBody.filter = filterString;
        }
        
        // Log the complete request body for debugging
        console.log('Complete search request:', JSON.stringify(requestBody, null, 2));
        
        // Make search request
        const response = await fetch(`${config.searchServiceUrl}/indexes/${config.indexName}/docs/search?api-version=2020-06-30`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': config.apiKey
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Search API error:', errorText);
            throw new Error(`Search API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Log the first result to see the actual field names and values
        if (data.value && data.value.length > 0) {
            console.log('First search result:', data.value[0]);
        }
        
        console.log('Search response:', data);
        
        // Update facets if returned
        if (data['@search.facets']) {
            currentState.facets = data['@search.facets'];
            renderFacets();
        }
        
        // Update total results
        currentState.totalResults = data['@odata.count'] || 0;
        
        // Render results
        renderResults(data.value);
        
        // Update result count
        resultCount.textContent = `${currentState.totalResults} ${currentState.totalResults === 1 ? 'item' : 'items'}`;
        
        // Render pagination
        renderPagination();
        
    } catch (error) {
        console.error('Search error:', error);
        showErrorMessage('An error occurred while searching. Please try again later.');
    }
}

// Perform search
async function performSearch() {
    const searchTerm = searchInput.value.trim();
    
    // Use wildcard search if the term is empty
    const queryTerm = searchTerm || "*";
    
    // Update current state
    currentState.searchTerm = queryTerm;
    
    // Show loading state
    showLoadingState();
    
    // Perform search with default sorting
    performSearchWithParams(queryTerm);
}

// Fetch facets for filters
async function fetchFacets() {
    try {
        // Build request body for facets-only query
        const requestBody = {
            search: "*",
            searchMode: "any",
            queryType: "simple",
            facets: config.searchParams.facetFields,
            count: true,
            top: 0
        };
        
        console.log('Facets request:', JSON.stringify(requestBody));
        
        const response = await fetch(`${config.searchServiceUrl}/indexes/${config.indexName}/docs/search?api-version=2020-06-30`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': config.apiKey
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch facets');
        }
        
        const data = await response.json();
        
        if (data['@search.facets']) {
            currentState.facets = data['@search.facets'];
            renderFacets();
        } else {
            console.error('No facets returned in response');
        }
    } catch (error) {
        console.error('Error fetching facets:', error);
        showErrorMessage('Failed to load filters. Please try again later.');
    }
}

// Render facets in the filter sections
function renderFacets() {
    renderFacetSection(categoryFilters, 'CATEGORY_DESCRIPTION');
    renderFacetSection(groupFilters, 'GROUP_DESCRIPTION');
    renderFacetSection(subgroupFilters, 'SUBGROUP_DESCRIPTION');
    renderTopicFilters();
}

// Render a specific facet section
function renderFacetSection(container, facetName) {
    if (!currentState.facets[facetName]) {
        container.innerHTML = '<p class="text-muted">No filters available</p>';
        return;
    }
    
    const facets = currentState.facets[facetName];
    
    // Sort facets alphabetically
    facets.sort((a, b) => a.value.localeCompare(b.value));
    
    let html = '';
    
    facets.forEach((facet, index) => {
        const isChecked = currentState.filters[facetName].includes(facet.value);
        const safeValue = facet.value.replace(/"/g, '&quot;');
        
        html += `
            <div class="filter-item form-check">
                <input class="form-check-input" type="checkbox" id="${facetName}-${index}" 
                    ${isChecked ? 'checked' : ''} 
                    data-facet="${facetName}" 
                    data-value="${safeValue}">
                <label class="form-check-label" for="${facetName}-${index}">
                    ${facet.value}
                    <span class="count">${facet.count}</span>
                </label>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add event listeners to checkboxes
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleFilterChange);
    });
}

// Render Topic filters manually
function renderTopicFilters() {
    // Create static Topic filters
    const topicValues = [
        { value: 'MBS Item', count: 0 },
        { value: 'Notes', count: 0 }
    ];
    
    let html = '';
    
    topicValues.forEach((topic, index) => {
        const isChecked = currentState.filters.Topic.includes(topic.value);
        
        html += `
            <div class="filter-item form-check">
                <input class="form-check-input" type="checkbox" id="Topic-${index}" 
                    ${isChecked ? 'checked' : ''} 
                    data-facet="Topic" 
                    data-value="${topic.value}">
                <label class="form-check-label" for="Topic-${index}">
                    ${topic.value}
                </label>
            </div>
        `;
    });
    
    topicFilters.innerHTML = html;
    
    // Add event listeners to checkboxes
    const checkboxes = topicFilters.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleFilterChange);
    });
}

// Handle filter checkbox changes
function handleFilterChange(event) {
    const facet = event.target.dataset.facet;
    const value = event.target.dataset.value;
    
    // Log the facet and value for debugging
    console.log(`Filter change: ${facet} = ${value}`);
    
    if (event.target.checked) {
        // Add filter
        if (!currentState.filters[facet].includes(value)) {
            currentState.filters[facet].push(value);
        }
    } else {
        // Remove filter
        currentState.filters[facet] = currentState.filters[facet].filter(item => item !== value);
    }
    
    // Reset to first page and perform search
    currentState.currentPage = 1;
    performSearch();
}

// Clear all filters
function clearAllFilters() {
    // Reset all filters
    Object.keys(currentState.filters).forEach(key => {
        currentState.filters[key] = [];
    });
    
    // Reset checkboxes
    document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset to first page and perform search if there's a search term
    currentState.currentPage = 1;
    if (currentState.searchTerm) {
        performSearch();
    }
}

// Render search results
function renderResults(results) {
    if (results.length === 0) {
        showNoResults();
        return;
    }
    
    let html = '';
    
    results.forEach(result => {
        // Check if the result is a Note or MBS item
        if (result.Topic === 'Notes') {
            // Render Notes layout (purple header with note number and navigation)
            html += renderNoteCard(result);
        } else {
            // Render MBS item layout (teal header with category and fee information)
            html += renderMBSItemCard(result);
        }
    });
    
    resultsList.innerHTML = html;
    
    // Show results
    initialMessage.classList.add('d-none');
    loadingResults.classList.add('d-none');
    noResults.classList.add('d-none');
    resultsList.classList.remove('d-none');
    
    // Add event listeners to view details buttons
    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', () => {
            const rowKey = button.dataset.rowkey;
            viewItemDetails(rowKey);
        });
    });
}

// Render a Note card
function renderNoteCard(result) {
    // Extract note information
    const noteNumber = result.NOTE_NUMBER || '';
    const associatedItems = result.ASSOCIATED_ITEM_NUMBERS ? result.ASSOCIATED_ITEM_NUMBERS.split(',') : [];
    
    // Build related items HTML
    let relatedItemsHtml = '';
    if (associatedItems.length > 0) {
        relatedItemsHtml = `
            <div class="mt-2">
                <strong>Related Items:</strong> 
                ${associatedItems.map(item => `<span class="badge bg-secondary me-1">${item.trim()}</span>`).join('')}
            </div>
        `;
    }
    
    // Build navigation links
    const prevNote = result.prevNote ? `<a href="#" class="prev-note"><i class="bi bi-arrow-left"></i> Previous - Note ${result.prevNote}</a>` : '';
    const nextNote = result.nextNote ? `<a href="#" class="next-note">Next - Note ${result.nextNote} <i class="bi bi-arrow-right"></i></a>` : '';
    
    return `
        <div class="result-item card mb-3" data-rowkey="${result.RowKey}">
            <div class="card-header bg-purple text-white d-flex justify-content-between align-items-center">
                <span>${result.CATEGORY_DESCRIPTION || 'DIAGNOSTIC IMAGING SERVICES'}</span>
                <strong class="note-number">${noteNumber}</strong>
            </div>
            <div class="card-body">
                <div class="description mb-3">
                    ${highlightSearchTerm(result.DESCRIPTION_TEXT || result.HUMAN_READABLE_DESCRIPTION || 'No description available', currentState.searchTerm)}
                </div>
                
                ${relatedItemsHtml}
                
                <div class="mt-2 d-flex justify-content-end">
                    <div class="navigation-links">
                        ${prevNote}
                        ${nextNote}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render an MBS Item card
function renderMBSItemCard(result) {
    // Extract fee information
    const fee = result.SCHEDULE_FEE ? parseFloat(result.SCHEDULE_FEE) : 0;
    const benefit75 = fee * 0.75;
    const benefit85 = fee * 0.85;
    
    // Format fee information in a more structured layout
    let feeHtml = '';
    if (result.SCHEDULE_FEE) {
        feeHtml = `
            <div class="fee-info p-3">
                <div class="row">
                    <div class="col-md-4">
                        <div class="fee-label">Schedule Fee</div>
                        <div class="fee-amount">$${fee.toFixed(2)}</div>
                    </div>
                    <div class="col-md-4">
                        <div class="fee-label">Benefit (75%)</div>
                        <div class="fee-amount">$${benefit75.toFixed(2)}</div>
                    </div>
                    <div class="col-md-4">
                        <div class="fee-label">Benefit (85%)</div>
                        <div class="fee-amount">$${benefit85.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="result-item card mb-3" data-rowkey="${result.RowKey}">
            <div class="card-header bg-info text-white">
                ${result.CATEGORY_DESCRIPTION || ''}
            </div>
            <div class="card-body">
                <div class="row mb-2">
                    <div class="col-md-2">
                        <strong class="item-number">${result.ITEM_NUMBER}</strong>
                        <i class="bi bi-info-circle text-info ms-1" data-toggle="tooltip" title="Item Number"></i>
                    </div>
                    <div class="col-md-10">
                        <div class="row">
                            <div class="col-md-3 text-md-end">Group</div>
                            <div class="col-md-9">${result.GROUP_CODE} - ${result.GROUP_DESCRIPTION || ''}</div>
                        </div>
                        <div class="row">
                            <div class="col-md-3 text-md-end">Subgroup</div>
                            <div class="col-md-9">${result.SUBGROUP_CODE} - ${result.SUBGROUP_DESCRIPTION || ''}</div>
                        </div>
                        <div class="row">
                            <div class="col-md-3 text-md-end">Topic</div>
                            <div class="col-md-9"><span class="badge bg-info">${result.Topic || 'MBS item'}</span></div>
                        </div>
                    </div>
                </div>
                
                <div class="description mb-3">
                    ${highlightSearchTerm(result.DESCRIPTION_TEXT || result.HUMAN_READABLE_DESCRIPTION || 'No description available', currentState.searchTerm)}
                </div>
                
                ${feeHtml}
                
                <div class="mt-3 d-flex justify-content-between">
                    <button class="btn btn-sm btn-outline-primary view-details" data-rowkey="${result.RowKey}">
                        View Details
                    </button>
                    <div class="navigation-links">
                        ${result.prevItem ? `<a href="#" class="prev-item me-2" data-item="${result.prevItem}">← Previous - Item ${result.prevItem}</a>` : ''}
                        ${result.nextItem ? `<a href="#" class="next-item" data-item="${result.nextItem}">Next - Item ${result.nextItem} →</a>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Highlight search terms in text
function highlightSearchTerm(text, searchTerm) {
    if (!text || !searchTerm) {
        return text;
    }
    
    const searchTerms = searchTerm.split(' ').filter(term => term.length > 2);
    let highlightedText = text;
    
    searchTerms.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<span class="highlight">$1</span>');
    });
    
    return highlightedText;
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(currentState.totalResults / config.searchParams.resultsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `
        <li class="page-item ${currentState.currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentState.currentPage - 1}" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;
    
    // Page numbers
    const startPage = Math.max(1, currentState.currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === currentState.currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }
    
    // Next button
    html += `
        <li class="page-item ${currentState.currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentState.currentPage + 1}" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;
    
    pagination.innerHTML = html;
    
    // Add event listeners to pagination links
    document.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(link.dataset.page);
            
            if (page !== currentState.currentPage && page >= 1 && page <= totalPages) {
                currentState.currentPage = page;
                performSearch();
                
                // Scroll to top of results
                document.querySelector('.card-header').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// View item details
async function viewItemDetails(rowKey) {
    try {
        // Show loading in modal
        itemDetailsContent.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading item details...</p>
            </div>
        `;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('itemDetailsModal'));
        modal.show();
        
        // Fetch item details
        const response = await fetch(`${config.searchServiceUrl}/indexes/${config.indexName}/docs/${rowKey}?api-version=2020-06-30`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'api-key': config.apiKey
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch item details');
        }
        
        const item = await response.json();
        
        // Render item details
        let html = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h4>Item ${item.ITEM_NUMBER}</h4>
                    <div class="text-muted">${item.CATEGORY_DESCRIPTION} > ${item.GROUP_DESCRIPTION} > ${item.SUBGROUP_DESCRIPTION}</div>
                </div>
                <div class="col-md-6 text-md-end">
                    ${item.SCHEDULE_FEE ? `<h5 class="text-success">Fee: $${item.SCHEDULE_FEE}</h5>` : ''}
                </div>
            </div>
            
            <div class="card mb-4">
                <div class="card-header">
                    <h5 class="mb-0">Description</h5>
                </div>
                <div class="card-body">
                    <p>${item.DESCRIPTION_TEXT || item.HUMAN_READABLE_DESCRIPTION || 'No description available'}</p>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0">Classification</h5>
                        </div>
                        <div class="card-body">
                            <div class="item-detail-row">
                                <div class="item-detail-label">Category</div>
                                <div>${item.CATEGORY_CODE} - ${item.CATEGORY_DESCRIPTION || 'N/A'}</div>
                            </div>
                            <div class="item-detail-row">
                                <div class="item-detail-label">Group</div>
                                <div>${item.GROUP_CODE} - ${item.GROUP_DESCRIPTION || 'N/A'}</div>
                            </div>
                            <div class="item-detail-row">
                                <div class="item-detail-label">Subgroup</div>
                                <div>${item.SUBGROUP_CODE} - ${item.SUBGROUP_DESCRIPTION || 'N/A'}</div>
                            </div>
                            <div class="item-detail-row">
                                <div class="item-detail-label">Subheading</div>
                                <div>${item.SUBHEADING_CODE ? `${item.SUBHEADING_CODE} - ${item.SUBHEADING_DESCRIPTION || 'N/A'}` : 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0">Fee Information</h5>
                        </div>
                        <div class="card-body">
                            <div class="item-detail-row">
                                <div class="item-detail-label">Schedule Fee</div>
                                <div>${item.SCHEDULE_FEE ? `$${item.SCHEDULE_FEE}` : 'N/A'}</div>
                            </div>
                            <div class="item-detail-row">
                                <div class="item-detail-label">Benefit 75%</div>
                                <div>${item.BENEFIT_75 ? `$${item.BENEFIT_75}` : 'N/A'}</div>
                            </div>
                            <div class="item-detail-row">
                                <div class="item-detail-label">Benefit 85%</div>
                                <div>${item.BENEFIT_85 ? `$${item.BENEFIT_85}` : 'N/A'}</div>
                            </div>
                            <div class="item-detail-row">
                                <div class="item-detail-label">Benefit 100%</div>
                                <div>${item.BENEFIT_100 ? `$${item.BENEFIT_100}` : 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            ${item.ITEM_ASSOCIATED_NOTES ? `
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Associated Notes</h5>
                    </div>
                    <div class="card-body">
                        <p>${item.ITEM_ASSOCIATED_NOTES}</p>
                    </div>
                </div>
            ` : ''}
        `;
        
        itemDetailsContent.innerHTML = html;
        
    } catch (error) {
        console.error('Error fetching item details:', error);
        itemDetailsContent.innerHTML = `
            <div class="alert alert-danger">
                Failed to load item details. Please try again later.
            </div>
        `;
    }
}

// Show initial message
function showInitialMessage() {
    initialMessage.classList.remove('d-none');
    loadingResults.classList.add('d-none');
    noResults.classList.add('d-none');
    resultsList.classList.add('d-none');
    resultCount.textContent = '0 items';
    pagination.innerHTML = '';
}

// Show loading state
function showLoadingState() {
    initialMessage.classList.add('d-none');
    loadingResults.classList.remove('d-none');
    noResults.classList.add('d-none');
    resultsList.classList.add('d-none');
}

// Show no results message
function showNoResults() {
    initialMessage.classList.add('d-none');
    loadingResults.classList.add('d-none');
    noResults.classList.remove('d-none');
    resultsList.classList.add('d-none');
}

// Show error message
function showErrorMessage(message) {
    initialMessage.classList.add('d-none');
    loadingResults.classList.add('d-none');
    noResults.classList.add('d-none');
    resultsList.classList.remove('d-none');
    
    resultsList.innerHTML = `
        <div class="alert alert-danger">
            ${message}
        </div>
    `;
}

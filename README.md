# Medicare Benefits Schedule Search Application

A modern, responsive web application for searching the Medicare Benefits Schedule (MBS) using the Azure Search API.

## Features

- Keyword-based search functionality
- Faceted filtering by Category, Group, and Subgroup
- Responsive design that works on desktop and mobile devices
- Pagination for navigating through search results
- Detailed view of individual MBS items
- Result count and highlighting of search terms

## Setup Instructions

1. Clone or download this repository to your local machine.

2. Configure your Azure Search API credentials:
   - Open the `config.js` file
   - Replace `YOUR_AZURE_SEARCH_SERVICE_URL` with your Azure Search service URL
   - Replace `YOUR_AZURE_SEARCH_API_KEY` with your Azure Search API key

3. Host the application:
   - You can use any web server to host the application
   - For local development, you can use tools like Live Server in VS Code or Python's SimpleHTTPServer

## Usage

1. Enter a search term in the search box and press Enter or click the Search button.
2. Use the filters on the left to narrow down your search results by Category, Group, or Subgroup.
3. Click "View Details" on any result to see more information about that MBS item.
4. Use the pagination controls at the bottom to navigate through multiple pages of results.

## Technical Details

This application is built using:
- HTML5
- CSS3 with Bootstrap 5 for responsive design
- Vanilla JavaScript (no frameworks)
- Azure Search API for search functionality

The application uses the following Azure Search index fields:
- Searchable fields: Item numbers, categories, descriptions
- Filterable fields: Categories, groups, subgroups
- Facetable fields: Categories, groups, subgroups

## Customization

You can customize the application by:
- Modifying the `config.js` file to change search parameters
- Editing the `styles.css` file to change the appearance
- Updating the `index.html` file to modify the layout

## Notes

- This application only implements keyword-based search
- The application requires a valid Azure Search API endpoint and key to function.
- CORS must be enabled on your Azure Search service to allow requests from your application's domain.

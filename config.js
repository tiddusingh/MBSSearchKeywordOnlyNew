// Azure Search API Configuration
const config = {
    // Azure Search API endpoint
    searchServiceUrl: "https://aiservice-mbssearch.search.windows.net",
    
    // Azure Search API key
    apiKey: "VTxTzp2KtYpPubAwuebIUtIV61uojl66AsWtOjHkRdAzSeBshXXA",
    
    // Azure Search index name
    indexName: "mbs-item-notes-combined",
    
    // Search parameters
    searchParams: {
        // Number of results per page
        resultsPerPage: 10,
        
        // Fields to include in search
        searchFields: [
            "ITEM_NUMBER",
            "ITEM_NUMBERAlias",
            "CATEGORY_DESCRIPTION",
            "GROUP_DESCRIPTION",
            "SUBGROUP_DESCRIPTION",
            "DESCRIPTION_TEXT",
            "HUMAN_READABLE_DESCRIPTION",
            "Topic",
            "NOTE_NUMBER"
        ],
        
        // Fields to retrieve in results
        selectFields: [
            "RowKey",
            "ITEM_NUMBER",
            "CATEGORY_CODE",
            "CATEGORY_DESCRIPTION",
            "GROUP_CODE",
            "GROUP_DESCRIPTION",
            "SUBGROUP_CODE",
            "SUBGROUP_DESCRIPTION",
            "DESCRIPTION_TEXT",
            "HUMAN_READABLE_DESCRIPTION",
            "SCHEDULE_FEE",
            "Topic",
            "NOTE_NUMBER",
            "ASSOCIATED_ITEM_NUMBERS"
        ],
        
        // Facet fields for filtering
        facetFields: [
            "CATEGORY_DESCRIPTION",
            "GROUP_DESCRIPTION",
            "SUBGROUP_DESCRIPTION"
        ]
    }
};

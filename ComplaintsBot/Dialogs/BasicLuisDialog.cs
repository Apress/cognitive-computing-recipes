using System;
using System.Configuration;
using System.Threading.Tasks;

using Microsoft.Bot.Builder.Dialogs;
using Microsoft.Bot.Builder.Luis;
using Microsoft.Bot.Builder.Luis.Models;

using Microsoft.Azure.Search;
using Microsoft.Azure.Search.Models;

namespace Microsoft.Bot.Sample.LuisBot
{
    // For more information about this template visit http://aka.ms/azurebots-csharp-luis
    [Serializable]
    public class BasicLuisDialog : LuisDialog<object>
    {
        public BasicLuisDialog() : base(new LuisService(new LuisModelAttribute(
            ConfigurationManager.AppSettings["LuisAppId"], 
            ConfigurationManager.AppSettings["LuisAPIKey"], 
            domain: ConfigurationManager.AppSettings["LuisAPIHostName"])))
        {
        }

        [LuisIntent("None")]
        public async Task NoneIntent(IDialogContext context, LuisResult result)
        {
            await this.ShowLuisResult(context, result);
        }

        // Go to https://luis.ai and create a new intent, then train/publish your luis app.
        // Finally replace "Greeting" with the name of your newly created intent in the following handler
        [LuisIntent("Greeting")]
        public async Task GreetingIntent(IDialogContext context, LuisResult result)
        {
            await this.ShowLuisResult(context, result);
        }

        [LuisIntent("Cancel")]
        public async Task CancelIntent(IDialogContext context, LuisResult result)
        {
            await this.ShowLuisResult(context, result);
        }

        [LuisIntent("Help")]
        public async Task HelpIntent(IDialogContext context, LuisResult result)
        {
            await this.ShowLuisResult(context, result);
        }

        [LuisIntent("Complaints.SearchByCompany")]
        public async Task SearchByCompanyIntent(IDialogContext context, LuisResult result)
        {
            // ---------------------------------------------------------------------------
            // Get Entity value extracted from Utterance
            // ---------------------------------------------------------------------------
            string entityValue = result.Entities[0].Entity;

            // ---------------------------------------------------------------------------
            // Get Search Service Configuration Settings
            // ---------------------------------------------------------------------------
            string searchServiceName = ConfigurationManager.AppSettings["SearchServiceName"].ToString();
            string adminApiKey = ConfigurationManager.AppSettings["SearchServiceAdminApiKey"].ToString();
            string queryApiKey = ConfigurationManager.AppSettings["SearchServiceQueryApiKey"].ToString();
            string searchIndexName = ConfigurationManager.AppSettings["SearchIndexName"].ToString();

            // ---------------------------------------------------------------------------
            // Initialize client objects to reference the Search Service and Index
            // ---------------------------------------------------------------------------
            SearchServiceClient serviceClient = new SearchServiceClient(searchServiceName, new SearchCredentials(adminApiKey));
            ISearchIndexClient indexClient = new SearchIndexClient(searchServiceName, searchIndexName, new SearchCredentials(queryApiKey));
            DocumentSearchResult<ConsumerComplaint> searchResults;

            // ---------------------------------------------------------------------------
            // Specify fields to return from the search results
            // ---------------------------------------------------------------------------
            SearchParameters parameters = new SearchParameters()
            {
                Select = new[] { "Company", "Product", "Issue" },
                IncludeTotalResultCount = true
            };

            // ---------------------------------------------------------------------------
            // Call the search service and pass the extracted entity value
            // ---------------------------------------------------------------------------
            searchResults = indexClient.Documents.Search<ConsumerComplaint>(entityValue, parameters);

            // ---------------------------------------------------------------------------
            // Format the returned results to display a response to the user
            // ---------------------------------------------------------------------------
            const string strSummary = "I found {0} complaints for {1}.\nHere is a quick summary:{2}";
            long totalCount = searchResults.Count.GetValueOrDefault();

            string summary = "";
            if (totalCount > 0)
                foreach (SearchResult<ConsumerComplaint> complaint in searchResults.Results)
                    summary += String.Format("\n - {0} filed for {1}", complaint.Document.Issue, complaint.Document.Product);

            string responseText = (totalCount > 0) ? String.Format(strSummary, totalCount.ToString(), entityValue.ToUpper(), summary) : "I cannot find any complaints in the system.";

            // ---------------------------------------------------------------------------
            // Display the response
            // ---------------------------------------------------------------------------
            await context.PostAsync(responseText);
        }

        private async Task ShowLuisResult(IDialogContext context, LuisResult result) 
        {
            await context.PostAsync($"You have reached {result.Intents[0].Intent}. You said: {result.Query}");
            context.Wait(MessageReceived);
        }
    }
}
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Microsoft.Bot.Sample.LuisBot
{
    public class ConsumerComplaint
    {
        public DateTime Date_received { get; set; }
        public string Product { get; set; }
        public string Sub_product { get; set; }
        public string Issue { get; set; }
        public string Sub_issue { get; set; }
        public string Consumer_complaint_narrative { get; set; }
        public string Company_public_response { get; set; }
        public string Company { get; set; }
        public string State { get; set; }
        public string ZIP_code { get; set; }
        public string Tags { get; set; }
        public string Consumer_consent_provided_ { get; set; }
        public string Submitted_via { get; set; }
        public DateTime Date_sent_to_company { get; set; }
        public string Company_response_to_consumer { get; set; }
        public string Timely_response_ { get; set; }
        public string Consumer_disputed_ { get; set; }
        public int Complaint_ID { get; set; }
    }
}
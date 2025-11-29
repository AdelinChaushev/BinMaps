using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BinMaps.Data.Entities
{
    public class Report
    {
        [Key]
        public int Id { get; set; }

        public DateTime ReportDate { get; set; }
        [ForeignKey(nameof(ReportType))]
        public int ReportTypeId { get; set; }
        public ReportType ReportType { get; set; }

        [ForeignKey(nameof(ThrashContainer))]
        public int ThrashContainerId { get; set; }
        public ThrashContainer ThrashContainer { get; set; }
        [ForeignKey(nameof(IdentityUser))]
        public string IdentityUserId { get; set; }
        public IdentityUser IdentityUser { get; set; }

    }
}

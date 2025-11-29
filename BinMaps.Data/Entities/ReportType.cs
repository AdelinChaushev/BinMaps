using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace BinMaps.Data.Entities
{
    public class ReportType
    {
        public ReportType(List<Report> reports)
        {
            this.reports = reports;
        }

        [Key]
        public int Id { get; set; }

        public string Name { get; set; }

    
        public List<Report> reports { get; set; }
    }
}

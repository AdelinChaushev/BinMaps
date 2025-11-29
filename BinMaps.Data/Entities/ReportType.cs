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
        public ReportType()
        {
            Reports = new List<Report>();
        }

        [Key]
        public int Id { get; set; }

        public string Name { get; set; }


        public ICollection<Report> Reports { get; set; }
    }
}

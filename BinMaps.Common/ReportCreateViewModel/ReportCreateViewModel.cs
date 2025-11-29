using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BinMaps.Common.ReportCreateViewModel
{
    public  class ReportCreateViewModel
    {
        [Required]
        public int ContainerId { get; set; }

        [Required]
        public int ReportTypeId { get; set; }

        public string Description { get; set; }
    }
}

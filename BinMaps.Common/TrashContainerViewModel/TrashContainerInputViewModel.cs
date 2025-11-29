using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.NetworkInformation;
using System.Text;
using System.Threading.Tasks;

namespace BinMaps.Common.TrashContainerViewModel
{
    public class TrashContainerInputViewModel
    {
        public int Id { get; set; }
        public double Percentage { get; set; }

        public double BatteryPercentage  { get; set; }

        public double Temperature { get; set; }
    }
}

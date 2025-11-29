using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BinMaps.Common.TrashContainerViewModel
{
    public class TrashContainerOutputViewModel
    {
        public int Id { get; set; }

        public double Percenatge { get; set; }

        public double LocationX { get; set; }
        public double LocationY { get; set; }

        public double  Capacity { get; set; }

        public int AreaId { get; set; }
    }
}

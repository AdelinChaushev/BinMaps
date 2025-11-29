using BinMaps.Common.TrashContainerViewModel;
using BinMaps.Data.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security;
using System.Text;
using System.Threading.Tasks;

namespace BinMaps.Common.AreaViewModels
{
    public class AreaReadyViewModel
    {
        public int Id { get; set; }

        public Truck truck { get; set; }

        public IEnumerable<TrashContainerOutputViewModel> Containers { get; set; }
    }
}

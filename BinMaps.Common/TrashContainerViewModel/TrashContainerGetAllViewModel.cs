using BinMaps.Common.AreaViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BinMaps.Common.TrashContainerViewModel
{
    public class TrashContainerGetAllViewModel
    {
        public IEnumerable<TrashContainerOutputViewModel> Containers { get; set; }
        public AreaReadyViewModel[] AreasForCleaning { get; set; }

    }
}

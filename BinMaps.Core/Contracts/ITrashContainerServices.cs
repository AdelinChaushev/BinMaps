using BinMaps.Common.AreaViewModels;
using BinMaps.Common.TrashContainerViewModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BinMaps.Core.Contracts
{
    public interface ITrashContainerServices
    {
        public AreaReadyViewModel[] GetAll();
        public Task AddTrashToTheTrashContainer(IEnumerable<TrashContainerInputViewModel> containers );

        public Task RemoveTrashFromTheTrashContainers(int[] containers);
    }
}

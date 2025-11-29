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
        public IEnumerable<TrashContainerOutputViewModel> GetAll();
        public Task AddTrashToTheTrashContainer(IEnumerable<TrashContainerInputViewModel> containers );

        public Task RemoveTrashToTheTrashContainer(int[] containers);
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BinMaps.Core.Contracts
{
    public interface ITrashContainerServices
    {
        public Task AddTrashToTheTrashContainer();
    }
}

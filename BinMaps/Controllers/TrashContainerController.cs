using BinMaps.Core.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace BinMaps.Controllers
{
    [ApiController]
    public class TrashContainerController : ControllerBase
    { 
       private readonly  ITrashContainerServices _trashContainerServices;

        public TrashContainerController(ITrashContainerServices trashContainerServices)
        {
            _trashContainerServices = trashContainerServices;
        }
        [HttpGet("api/trashcontainers")]
        public IActionResult GetAll() 
        => Ok(_trashContainerServices.GetAll());
        public async Task<IActionResult> AddTrashToTheTrashContainer(Dictionary<int,int> containers)
        {
            await _trashContainerServices.AddTrashToTheTrashContainer(containers);
            return Ok();
        }

    }
}

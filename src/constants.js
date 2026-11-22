// Free of process.env access so it is safe to require from workflow code.
module.exports = {
  TASK_QUEUE: 'hotel-offers',
  WORKFLOW_NAME: 'hotelOffersWorkflow',
  ERR_ALL_SUPPLIERS_FAILED: 'ALL_SUPPLIERS_FAILED',
};

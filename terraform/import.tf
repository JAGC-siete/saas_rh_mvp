import {
  id = "/aws/vpc/saas-hr-staging/flow-log"
  to = module.vpc.aws_cloudwatch_log_group.flow_log
}

import {
  id = "saas-hr-staging-flow-log"
  to = module.vpc.aws_iam_role.flow_log
}

import {
  id = "saas-hr-staging-db-subnet-group"
  to = module.vpc.aws_db_subnet_group.database
}

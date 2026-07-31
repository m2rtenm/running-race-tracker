resource "aws_dynamodb_table" "races" {
  name             = "running-race-tracker-races"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "userId"
  range_key        = "raceId"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "raceId"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  attribute {
    name = "competitionName"
    type = "S"
  }

  global_secondary_index {
    name            = "userIdDateIndex"
    hash_key        = "userId"
    range_key       = "date"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "userIdCompetitionIndex"
    hash_key        = "userId"
    range_key       = "competitionName"
    projection_type = "ALL"
  }

  tags = {
    Environment = "production"
    Application = "running-race-tracker"
  }
}

resource "aws_dynamodb_table" "strava_imports" {
  name         = "running-race-tracker-strava-imports"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "importId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "importId"
    type = "S"
  }

  ttl {
    attribute_name = "expiryDate"
    enabled        = true
  }

  tags = {
    Environment = "production"
    Application = "running-race-tracker"
  }
}

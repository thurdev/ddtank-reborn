-- SQL_STORED_PROCEDURE dbo.SP_Treasure_Puzzle_Data_Update (modified 2015-02-03T12:49:23.687)

CREATE  PROCEDURE [dbo].[SP_Treasure_Puzzle_Data_Update]
   @ID int,
   @UserID int,
   @PuzzleID int,
   @hole1Need int,
   @hole1Have int,
   @hole2Need int,
   @hole2Have int,
   @hole3Need int,
   @hole3Have int,
   @hole4Need int,
   @hole4Have int,
   @hole5Need int,
   @hole5Have int,
   @hole6Need int,
   @hole6Have int,
   @IsGetAward bit
AS
SET XACT_ABORT ON
BEGIN TRAN
UPDATE [dbo].[Treasure_Puzzle_Data]
   SET [UserID] = @UserID
      ,[PuzzleID] = @PuzzleID
      ,[hole1Need] = @hole1Need
      ,[hole1Have] = @hole1Have
      ,[hole2Need] = @hole2Need
      ,[hole2Have] = @hole2Have
      ,[hole3Need] = @hole3Need
      ,[hole3Have] = @hole3Have
      ,[hole4Need] = @hole4Need
      ,[hole4Have] = @hole4Have
      ,[hole5Need] = @hole5Need
      ,[hole5Have] = @hole5Have
      ,[hole6Need] = @hole6Need
      ,[hole6Have] = @hole6Have
      ,[IsGetAward] = @IsGetAward
WHERE ID = @ID
IF @@ERROR <> 0
BEGIN
    ROLLBACK TRAN
    RETURN @@ERROR
END
COMMIT TRAN
SET XACT_ABORT OFF
RETURN 0

GO

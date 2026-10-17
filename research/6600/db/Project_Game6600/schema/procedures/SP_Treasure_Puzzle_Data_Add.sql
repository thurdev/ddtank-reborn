-- SQL_STORED_PROCEDURE dbo.SP_Treasure_Puzzle_Data_Add (modified 2015-02-03T12:49:23.680)

CREATE  PROCEDURE [dbo].[SP_Treasure_Puzzle_Data_Add]
   @ID int output,
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
DECLARE @count int
SELECT @count=COUNT(*) FROM [dbo].Treasure_Puzzle_Data WHERE ID = @ID
IF @count >0
BEGIN
    RETURN 1
END
SET XACT_ABORT ON
BEGIN TRAN
INSERT INTO [dbo].[Treasure_Puzzle_Data]
         (UserID
         ,PuzzleID
         ,hole1Need
         ,hole1Have
         ,hole2Need
         ,hole2Have
         ,hole3Need
         ,hole3Have
         ,hole4Need
         ,hole4Have
         ,hole5Need
         ,hole5Have
         ,hole6Need
         ,hole6Have
         ,IsGetAward)
    VALUES
         (@UserID
         ,@PuzzleID
         ,@hole1Need
         ,@hole1Have
         ,@hole2Need
         ,@hole2Have
         ,@hole3Need
         ,@hole3Have
         ,@hole4Need
         ,@hole4Have
         ,@hole5Need
         ,@hole5Have
         ,@hole6Need
         ,@hole6Have
         ,@IsGetAward)
     select @@identity as 'identity'
     set @ID=@@identity       
IF @@ERROR <> 0
BEGIN
    ROLLBACK TRAN
    RETURN @@ERROR
END
COMMIT TRAN
SET XACT_ABORT OFF
RETURN 0

GO

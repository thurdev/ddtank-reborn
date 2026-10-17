-- SQL_STORED_PROCEDURE dbo.SP_Ringstation_Battle_Field_Add (modified 2015-01-25T14:04:48.697)
CREATE  PROCEDURE [dbo].[SP_Ringstation_Battle_Field_Add]
   @ID int output,
   @UserID int,
   @DareFlag bit,
   @UserName nvarchar (150),
   @SuccessFlag bit,
   @Level int,
   @BattleTime datetime
AS
DECLARE @count int
SELECT @count=COUNT(*) FROM [dbo].Ringstation_Battle_Field WHERE ID = @ID
IF @count >0
BEGIN
    RETURN 1
END
SET XACT_ABORT ON
BEGIN TRAN
INSERT INTO [dbo].[Ringstation_Battle_Field]
         (UserID
         ,DareFlag
         ,UserName
         ,SuccessFlag
         ,Level
         ,BattleTime)
    VALUES
         (@UserID
         ,@DareFlag
         ,@UserName
         ,@SuccessFlag
         ,@Level
         ,@BattleTime)
    select @@identity as 'identity'
    set @ID=@@identity    
	if(@@error <> 0)
	begin
	  return 1
	end
IF @@ERROR <> 0
BEGIN
    ROLLBACK TRAN
    RETURN @@ERROR
END
COMMIT TRAN
SET XACT_ABORT OFF
RETURN 0

GO

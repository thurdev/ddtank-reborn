-- SQL_STORED_PROCEDURE dbo.SP_Sys_User_MagicHouse_Add (modified 2015-01-25T14:04:48.190)
CREATE  PROCEDURE [dbo].[SP_Sys_User_MagicHouse_Add]
   @ID int output,
   @UserID int,
   @isOpen bit,
   @isMagicRoomShow bit,
   @magicJuniorLv int,
   @magicJuniorExp int,
   @magicMidLv int,
   @magicMidExp int,
   @magicSeniorLv int,
   @magicSeniorExp int,
   @freeGetCount int,
   @freeGetTime datetime,
   @chargeGetCount int,
   @chargeGetTime datetime,
   @depotCount int,
   @activityWeapons nvarchar (1024)
AS
DECLARE @count int
SELECT @count=COUNT(*) FROM [dbo].Sys_User_MagicHouse WHERE [UserID] = @UserID
IF @count >0
BEGIN
    RETURN 1
END
SET XACT_ABORT ON
BEGIN TRAN
INSERT INTO [dbo].[Sys_User_MagicHouse]
         (UserID
         ,isOpen
         ,isMagicRoomShow
         ,magicJuniorLv
         ,magicJuniorExp
         ,magicMidLv
         ,magicMidExp
         ,magicSeniorLv
         ,magicSeniorExp
         ,freeGetCount
         ,freeGetTime
         ,chargeGetCount
         ,chargeGetTime
         ,depotCount
         ,activityWeapons)
    VALUES
         (@UserID
         ,@isOpen
         ,@isMagicRoomShow
         ,@magicJuniorLv
         ,@magicJuniorExp
         ,@magicMidLv
         ,@magicMidExp
         ,@magicSeniorLv
         ,@magicSeniorExp
         ,@freeGetCount
         ,@freeGetTime
         ,@chargeGetCount
         ,@chargeGetTime
         ,@depotCount
         ,@activityWeapons)
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

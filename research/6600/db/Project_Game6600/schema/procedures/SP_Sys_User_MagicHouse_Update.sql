-- SQL_STORED_PROCEDURE dbo.SP_Sys_User_MagicHouse_Update (modified 2015-01-25T14:04:48.187)
CREATE  PROCEDURE [dbo].[SP_Sys_User_MagicHouse_Update]
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
SET XACT_ABORT ON
BEGIN TRAN
UPDATE [dbo].[Sys_User_MagicHouse]
   SET [isOpen] = @isOpen
      ,[isMagicRoomShow] = @isMagicRoomShow
      ,[magicJuniorLv] = @magicJuniorLv
      ,[magicJuniorExp] = @magicJuniorExp
      ,[magicMidLv] = @magicMidLv
      ,[magicMidExp] = @magicMidExp
      ,[magicSeniorLv] = @magicSeniorLv
      ,[magicSeniorExp] = @magicSeniorExp
      ,[freeGetCount] = @freeGetCount
      ,[freeGetTime] = @freeGetTime
      ,[chargeGetCount] = @chargeGetCount
      ,[chargeGetTime] = @chargeGetTime
      ,[depotCount] = @depotCount
      ,[activityWeapons] = @activityWeapons
WHERE [UserID] = @UserID
IF @@ERROR <> 0
BEGIN
    ROLLBACK TRAN
    RETURN @@ERROR
END
COMMIT TRAN
SET XACT_ABORT OFF
RETURN 0
/*** ***/

GO

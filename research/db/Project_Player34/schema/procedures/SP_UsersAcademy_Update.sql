-- SQL_STORED_PROCEDURE dbo.SP_UsersAcademy_Update (modified 2021-06-04T05:18:36.563)





-- =============================================
-- Author:		Justin
-- Create date: 2008.11.26
-- Description:	插入用户购买物品信息
-- =============================================
CREATE PROCEDURE [dbo].[SP_UsersAcademy_Update]
	@UserID	int,
	@apprenticeshipState int,
	@masterID int,
	@masterOrApprentices nvarchar(500),
	@graduatesCount int,
	@honourOfMaster nvarchar(500),
	@freezesDate datetime
AS
BEGIN
	
	update Sys_Users_Detail set apprenticeshipState = @apprenticeshipState,
								masterID = @masterID,
								masterOrApprentices = @masterOrApprentices,
								graduatesCount = @graduatesCount,
								honourOfMaster = @honourOfMaster,
								freezesDate = @freezesDate

								where UserID = @UserID

	if @@error <> 0
	begin
		return 1
	end
	
	return 0
END






GO

-- SQL_STORED_PROCEDURE dbo.SP_Get_Rank_Caddy (modified 2021-06-04T05:18:35.363)



-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Get_Rank_Caddy] 
	-- Add the parameters for the stored procedure here
AS
BEGIN

    -- Insert statements for procedure here
	SELECT TOP 10 Sys_Users_Detail.NickName, Sys_Users_Detail.badLuckNumber, Sys_Users_Detail.UserID from Sys_Users_Detail where Sys_Users_Detail.UserID = Sys_Users_Detail.UserID order by Sys_Users_Detail.badLuckNumber DESC
END








GO

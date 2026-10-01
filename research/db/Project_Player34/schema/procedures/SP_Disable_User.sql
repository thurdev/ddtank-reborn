-- SQL_STORED_PROCEDURE dbo.SP_Disable_User (modified 2021-06-04T05:18:35.303)


-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Disable_User]
	-- Add the parameters for the stored procedure here
@UserName varchar(200),
@IsExist bit
AS
begin
set xact_abort on
begin tran
update Sys_Users_Detail
set IsExist=@IsExist
where UserName=@UserName

commit tran 
set xact_abort off
end









GO

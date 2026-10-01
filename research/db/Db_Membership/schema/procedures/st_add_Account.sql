-- SQL_STORED_PROCEDURE dbo.st_add_Account (modified 2012-04-21T07:55:47.373)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[st_add_Account]

	@Username		VARCHAR(32), 
	@Password 		VARCHAR(200),
	@Email 			VARCHAR(200) 
	--@Fullname 		NVARCHAR(100),
	--@Address 		NVARCHAR(250), 
	--@Phone       	int
	

AS
declare @count int

select @count= isnull(count(*),0) from Users where Username = @Username
if @count <> 0
begin
  return 5   --User da ton tai
end
--Them user vao
set xact_abort on
begin tran

insert into dbo.Users ([Username],[Password],[Email],[Fullname],[Address]) 
  Values (convert(nvarchar(32),@Username) ,convert(nvarchar(200),@PassWord) ,convert(nvarchar(200),@Email),convert(nvarchar(100),'none') ,convert(nvarchar(250),'none')) ;
  if @@error<>0
begin
  rollback tran
  return @@error
end
 
commit tran 
set xact_abort off

GO

-- SQL_STORED_PROCEDURE dbo.SP_UserInfo_Select (modified 2021-06-04T05:18:35.990)




CREATE proc [dbo].[SP_UserInfo_Select]
@type int,
@username varchar(50),
@nickname varchar(50)
as
begin
   if(@type=1)
   begin 
	select a.*,b.Consortianame 
  	 from dbo.sys_users_detail a 
     	   left join dbo.Consortia b 
              on a.Consortiaid=b.Consortiaid where nickname=@nickname
   end
   if(@type=2)
   begin
	select a.*,b.Consortianame 
 	 from dbo.sys_users_detail a 
  	   left join dbo.Consortia b 
   	      on a.Consortiaid=b.Consortiaid where username=@username
   end
   if(@@error <> 0)
   begin
  	return 1
   end
   return 0
 end










GO
